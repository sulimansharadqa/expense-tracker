// Load database settings before creating the connection pool.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Live Server uses another port, so the browser needs CORS permission.
app.use(cors());
app.use(express.json());

// Reuse one pool rather than opening a new connection in every route.
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const validCategories = [
    "Food",
    "Transport",
    "Bills",
    "Entertainment",
    "Other"
];

// SERIAL IDs must fit PostgreSQL's positive integer range.
function isValidId(id) {
    return /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0 && Number(id) <= 2147483647;
}

// Browser validation helps the user; this also protects direct API requests.
function validateExpense(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return "Expense data must be a JSON object";
    }

    if (typeof data.title !== "string" || !data.title.trim()) {
        return "Title is required";
    }

    if (data.title.trim().length > 100) {
        return "Title must be 100 characters or fewer";
    }

    if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount < 0.01) {
        return "Amount must be at least 0.01";
    }

    if (data.amount > 99999999.99) {
        return "Amount must not exceed 99999999.99";
    }

    if (Math.round(data.amount * 100) / 100 !== data.amount) {
        return "Amount must have no more than 2 decimal places";
    }

    if (!validCategories.includes(data.category)) {
        return "Category must be one of the allowed values";
    }

    if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        return "Date must be a valid date in YYYY-MM-DD format";
    }

    // A date like February 30 can roll into March, so compare it back to the input.
    const parsedDate = new Date(`${data.date}T00:00:00.000Z`);
    if (data.date.startsWith("0000-") || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== data.date) {
        return "Date must be a valid date in YYYY-MM-DD format";
    }

    return null;
}

// This checks Express only; it does not test the database connection.
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'Online',
        message: 'Express Server is running successfully!'
    });
});

// Convert database amounts and dates to the values the frontend expects.
app.get('/api/expenses', async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT 
                id,
                title,
                amount::float8,
                category,
                to_char(date,'YYYY-MM-DD') AS date
            FROM expenses
            ORDER BY id ASC
            `
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database query error"
        });
    }
});

// $1 takes its value from the array, keeping user data out of the SQL text.
app.get('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(404).json({
            message: "Expense not found"
        });
    }
    try {
        const result = await pool.query(
            `
            SELECT 
                id,
                title,
                amount::float8,
                category,
                to_char(date,'YYYY-MM-DD') AS date
            FROM expenses
            WHERE id=$1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database query error"
        });
    }
});

// PostgreSQL creates the ID. RETURNING gives us the newly saved row.
app.post('/api/expenses', async (req, res) => {
    const validationError = validateExpense(req.body);
    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    const { title, amount, category, date } = req.body;
    try {
        const result = await pool.query(
            `
            INSERT INTO expenses(title,amount,category,date)
            VALUES($1,$2,$3,$4)
            RETURNING
                id,
                title,
                amount::float8 AS amount,
                category,
                to_char(date, 'YYYY-MM-DD') AS date
            `,
            [title.trim(), amount, category, date]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database query error"
        });
    }
});

// Check both the ID and the complete expense before updating it.
app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(404).json({
            message: "Expense not found"
        });
    }

    const validationError = validateExpense(req.body);
    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    const { title, amount, category, date } = req.body;
    try {
        const result = await pool.query(
            `
            UPDATE expenses
            SET title=$1,
                amount=$2,
                category=$3,
                date=$4
            WHERE id=$5
            RETURNING
                id,
                title,
                amount::float8 AS amount,
                category,
                to_char(date, 'YYYY-MM-DD') AS date
            `,
            [title.trim(), amount, category, date, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database query error"
        });
    }
});

// No returned row means there was no expense with this ID.
app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
        return res.status(404).json({
            message: "Expense not found"
        });
    }
    try {
        const result = await pool.query(
            `
            DELETE FROM expenses
            WHERE id=$1
            RETURNING *
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.status(200).json({
            message: "Expense deleted successfully",
            expense: result.rows[0]
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Database query error"
        });
    }
});

// Invalid JSON fails in express.json(), before it can reach a route.
app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            message: 'Request body must be valid JSON'
        });
    }

    next(error);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
