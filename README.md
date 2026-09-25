# Expense Tracker

This project is Expense Tracker application. It provides a REST API built with Node.js, Express, and PostgreSQL to manage personal expenses at backend level and HTML, CSS, JavaScript, Bootstrap at frontend level. Users can add, view, update, and delete expenses stored in a PostgreSQL database.

## How to run

### Backend

1. Open the backend folder:

     ```bash
     cd backend
     ```

2. Install dependencies

     ```bash
     npm install
     ```

3. Database setup:
     1. Open pgAdmin4.
     2. Create a PostgreSQL database named `expense_tracker`.
     3. Right click on the database and select `Query Tool`.
     4. Load [schema.sql](backend/schema.sql) and execute the queries.

4. Configure Environment Variables:
     1. Copy `.env.example` to create `.env`:

     2. Open `.env` and configure your database credentials and port:

          ```env
          DB_HOST=localhost
          DB_PORT=5432
          DB_USER=postgres
          DB_PASSWORD=your_password_here
          DB_NAME=expense_tracker
          ```

5. Start Server

     ```bash
     node server.js
     ```

### Frontend

1. ...

## Features

<!-- List what your app can do. Tick what you finished. -->

- [ ] Add an expense (with validation)
- [ ] Delete an expense
- [ ] Edit an expense
- [ ] Filter by category
- [ ] Summary cards (total, count, highest)
- [ ] Data is saved in a PostgreSQL database

## Screenshots

<!-- Add 2-3 screenshots of your app (desktop and mobile). -->

## What was the hardest part?

<!-- A short paragraph: what got you stuck, and how did you solve it? -->
