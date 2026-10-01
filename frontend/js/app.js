// The page and API run on different ports during development.
const API_URL = "http://localhost:3000/api/expenses";
const timerInSeconds = 5;
const networkErrorReconnectTime = 5;

// For Control the theme
const themeData = document.documentElement.attributes.getNamedItem('data-bs-theme');
const navbar = document.getElementById('nav');
const toggleThemeButton = document.getElementById('toggle-theme');
// Stats Card Section
const statsCards = document.getElementById('stats-cards');
const statsExpensesLoading = document.getElementById('stats-expenses-loading');
const statsCardTotal = document.getElementById('stats-total');
const statsCardNumberOfExpenses = document.getElementById('stats-number-of-expenses');
const statsCardHighestExpense = document.getElementById('stats-highest-expense');
const statsCardHighestExpenseName = document.getElementById('stats-highest-expense-name');
// Add Expense section
const titleField = document.getElementById('title');
const amountField = document.getElementById('amount');
const categoryField = document.getElementById('category');
const dateField = document.getElementById('date');
const addExpense = document.getElementById('add-expinse');
// Expenses Table section
const expensesTable = document.getElementById('expenses-table');
const tableHeader = expensesTable.querySelector('thead'); // For sorting buttons
const tableTitleSearch = document.getElementById('title-search');
const tableCategoryFilter = document.getElementById('category-filter');
const expensesTableBody = document.getElementById('expenses-table-body');
const expensesLoading = document.getElementById('expenses-loading');
// Edit/Delete Modal
const editExpenseForm = document.getElementById('edit-expense-form');
const editTitleField = document.getElementById('edit-title');
const editAmountField = document.getElementById('edit-amount');
const editCategoryField = document.getElementById('edit-category');
const editDateField = document.getElementById('edit-date');
const deleteExpense = document.getElementById('confirm-delete');

// This is the last list received from the database, not permanent storage.
let expenses = [];

// Remember which row the user selected while a modal is open.
let selectedExpenseId = null;

// null restores the server order; 1 means ascending and -1 descending.
let sortState = { key: null, direction: 1 };

const alertTable = document.getElementById('liveAlertTable');
const alertAddExpense = document.getElementById('liveAlertAddExpense');

// helper function to toggle the theme
function toggleTheme() {
    if (themeData.value == 'light') {
        themeData.value = 'dark';
        navbar.classList.add('border-0', 'border-bottom');
        navbar.style.borderBottomColor = '#ffffff26';
        document.body.classList.add('bg-dark');
        document.body.classList.remove('bg-light');
    } else if (themeData.value == 'dark') {
        themeData.value = 'light';
        navbar.classList.remove('border-0', 'border-bottom', 'border-secondary');
        navbar.removeAttribute('style');
        document.body.classList.add('bg-light');
        document.body.classList.remove('bg-dark');
    }
}
// event listener to toggle theme
toggleThemeButton.addEventListener('click', toggleTheme);

// Use textContent so a message containing HTML cannot run as code.
function appendAlertTo(target, message, type) {
    const alert = document.createElement('div');
    alert.className = `mt-2 alert alert-${type} alert-dismissible fade show`;
    alert.setAttribute('role', 'alert');

    const text = document.createElement('div');
    text.textContent = message;
    alert.append(text);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'alert');
    closeButton.setAttribute('aria-label', 'Close');
    alert.append(closeButton);

    target.append(alert);

    setTimeout(() => {
        const bootstrapAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bootstrapAlert.close();
    }, timerInSeconds * 1000);
}

function appendExpenseAlert(message, type) {
    appendAlertTo(alertAddExpense, message, type);
}

function appendAlert(message, type) {
    appendAlertTo(alertTable, message, type);
}

// fetch uses TypeError when it cannot reach the server.
function getFriendlyErrorMessage(error) {
    if (error instanceof TypeError) {
        return `Cannot connect to the server. Check that the backend is running and try again in (${networkErrorReconnectTime} seconds).`;
    }

    return error.message || 'Something went wrong. Please try again.';
}

// Expense titles and categories are user data, so insert them as text.
function createExpenseRow(expense) {
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    titleCell.textContent = expense.title;
    row.append(titleCell);

    const amountCell = document.createElement('td');
    amountCell.textContent = Number(expense.amount).toFixed(2);
    row.append(amountCell);

    const categoryCell = document.createElement('td');
    const categoryBadge = document.createElement('span');
    const categoryClasses = {
        Food: 'text-bg-success',
        Transport: 'text-bg-primary',
        Bills: 'text-bg-warning',
        Entertainment: 'text-bg-info',
        Other: 'text-bg-secondary'
    };
    categoryBadge.className = `badge ${categoryClasses[expense.category] || 'text-bg-secondary'}`;
    categoryBadge.textContent = expense.category;
    categoryCell.append(categoryBadge);
    row.append(categoryCell);

    const dateCell = document.createElement('td');
    dateCell.textContent = expense.date;
    row.append(dateCell);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'd-flex gap-2 justify-content-center';

    for (const action of ['edit', 'delete']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = action === 'edit' ? 'btn btn-outline-primary' : 'btn btn-outline-danger';
        button.dataset.action = action;
        button.dataset.expenseId = expense.id;
        button.setAttribute('data-bs-toggle', 'modal');
        button.setAttribute('data-bs-target', action === 'edit' ? '#edit-expinse-modal' : '#delete-expinse-modal');
        button.textContent = action === 'edit' ? 'Edit' : 'Delete';
        actions.append(button);
    }

    actionsCell.append(actions);
    row.append(actionsCell);
    return row;
}

// Filtering must not change the saved list or the summary cards.
function renderTable(list = expenses) {
    const titleQuery = tableTitleSearch.value.trim().toLocaleLowerCase();
    const selectedCategory = tableCategoryFilter.value;
    const visibleExpenses = [];
    for (const expense of list) {
        const titleMatches = expense.title.toLocaleLowerCase().includes(titleQuery);
        const categoryMatches = selectedCategory === 'All' || expense.category === selectedCategory;
        if (titleMatches && categoryMatches) {
            visibleExpenses.push(expense);
        }
    }

    // Sort the new array so the original order is still available.
    if (sortState.key !== null) {
        visibleExpenses.sort((first, second) => {
            let difference = 0;
            if (sortState.key === 'amount') {
                difference = Number(first.amount) - Number(second.amount);
            } else if (sortState.key === 'title') {
                difference = first.title.localeCompare(second.title);
            } else if (sortState.key === 'category') {
                difference = first.category.localeCompare(second.category);
            } else if (sortState.key === 'date') {
                difference = first.date.localeCompare(second.date);
            }
            return difference * sortState.direction;
        });
    }

    expensesTableBody.replaceChildren();
    for (const expense of visibleExpenses) {
        expensesTableBody.append(createExpenseRow(expense));
    }
}

// Use the full list here, even when the table shows only one category.
function renderSummary(list) {
    let total = 0;
    let highestExpense = null;
    for (const expense of list) {
        total += Number(expense.amount);
        if (highestExpense === null || Number(expense.amount) > Number(highestExpense.amount)) {
            highestExpense = expense;
        }
    }

    statsCardTotal.textContent = total.toFixed(2);
    statsCardNumberOfExpenses.textContent = list.length;
    statsCardHighestExpense.textContent = highestExpense
        ? Number(highestExpense.amount).toFixed(2)
        : "0.00";
    statsCardHighestExpenseName.textContent = highestExpense
        ? highestExpense.title
        : "No expenses yet!";
}

tableTitleSearch.addEventListener("input", () => renderTable());
tableCategoryFilter.addEventListener("change", () => renderTable());

// Click the same heading three times: ascending, descending, then original order.
tableHeader.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-sort-by]');
    if (!button) return;

    if (sortState.key !== button.dataset.sortBy) {
        sortState = { key: button.dataset.sortBy, direction: 1 };
    } else if (sortState.direction === 1) {
        sortState.direction = -1;
    } else {
        sortState = { key: null, direction: 1 };
    }

    // Update labels and arrows together for keyboard and screen-reader users.
    tableHeader.querySelectorAll('th[aria-sort]').forEach((header) => {
        const headerButton = header.querySelector('button[data-sort-by]');
        const isActive = headerButton.dataset.sortBy === sortState.key;
        header.setAttribute('aria-sort', isActive
            ? (sortState.direction === 1 ? 'ascending' : 'descending')
            : 'none');
        headerButton.setAttribute('aria-label', `Sort by ${headerButton.dataset.sortBy}${isActive
            ? (sortState.direction === 1 ? ', ascending' : ', descending')
            : ''}`);
        headerButton.querySelector('span').textContent = isActive
            ? (sortState.direction === 1 ? ' ↑' : ' ↓')
            : '';
    });

    renderTable();
});

// Every successful change calls this again to show what the server stored.
async function loadExpenses() {
    statsExpensesLoading.classList.remove("d-none");
    expensesLoading.classList.remove("d-none");
    expensesTable.classList.add("d-none");
    statsCards.classList.add("d-none");

    try {
        const response = await fetch(API_URL);

        // fetch can succeed at connecting even when the HTTP status is an error.
        if (!response.ok) {
            throw new Error(`The server returned ${response.status}`);
        }

        expenses = await response.json();
        renderTable(expenses);
        renderSummary(expenses);
    } catch (error) {
        console.error("Could not load expenses:", error);
        appendAlert(getFriendlyErrorMessage(error), "danger");
        // Try loading again after a connection or server error.
        setTimeout(() => {
            loadExpenses();
        }, networkErrorReconnectTime * 1000);
    } finally {
        statsExpensesLoading.classList.add("d-none");
        expensesLoading.classList.add("d-none");
        expensesTable.classList.remove("d-none");
        statsCards.classList.remove("d-none");
    }
}

// One listener also works for rows added later by renderTable.
expensesTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    selectedExpenseId = Number(button.dataset.expenseId);

    if (button.dataset.action === "edit") {
        const expense = expenses.find(item => Number(item.id) === selectedExpenseId);
        if (!expense) return;

        editTitleField.value = expense.title;
        editAmountField.value = expense.amount;
        editCategoryField.value = expense.category;
        editDateField.value = expense.date;
    }
});

// Listen to submit so the browser checks required, min and step first.
const addExpenseForm = addExpense.closest("form");
addExpenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newExpense = {
        title: titleField.value.trim(),
        amount: Number(amountField.value),
        category: categoryField.value,
        date: dateField.value
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newExpense)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || "Could not add expense");
        }

        // Clear inputs only after the server confirms the save.
        addExpenseForm.reset();
        await loadExpenses();
        appendExpenseAlert("Expense added.", "success");
    } catch (error) {
        appendExpenseAlert(getFriendlyErrorMessage(error), "danger");
    }
});

// The modal sends all four fields to the selected expense's PUT endpoint.
editExpenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (selectedExpenseId === null) return;

    const updatedExpense = {
        title: editTitleField.value.trim(),
        amount: Number(editAmountField.value),
        category: editCategoryField.value,
        date: editDateField.value
    };

    try {
        const response = await fetch(`${API_URL}/${selectedExpenseId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedExpense)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || "Could not update expense");
        }

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("edit-expinse-modal")
        ).hide();
        tableCategoryFilter.focus();

        await loadExpenses();
        appendAlert("Expense updated.", "success");
    } catch (error) {
        appendAlert(getFriendlyErrorMessage(error), "danger");
    }
});

deleteExpense.addEventListener("click", async () => {
    if (selectedExpenseId === null) return;

    try {
        const response = await fetch(`${API_URL}/${selectedExpenseId}`, {
            method: "DELETE"
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || "Could not delete expense");
        }

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("delete-expinse-modal")
        ).hide();
        tableCategoryFilter.focus();

        await loadExpenses();
        appendAlert("Expense deleted.", "success");
        selectedExpenseId = null;
    } catch (error) {
        appendAlert(getFriendlyErrorMessage(error), "danger");
    }
});

loadExpenses();