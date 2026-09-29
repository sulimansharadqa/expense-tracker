// Expense Tracker - frontend logic

//const test = require("node:test");

// PHASE 2
// Your backend from Phase 1 is already running, with real expenses in the
// database (from schema.sql). Build this page directly against it with
// fetch and async/await - there is no in-memory or localStorage stage
// this time, and no sample data file.
//
// A possible structure (change it if you have a better idea):
//   - async function getExpenses()          fetch(API_URL), return the JSON
//   - async function addExpense(data)       fetch(API_URL, { method: "POST", ... })
//   - async function updateExpense(id,data) fetch(API_URL + "/" + id, { method: "PUT", ... })
//   - async function deleteExpense(id)      fetch(API_URL + "/" + id, { method: "DELETE" })
//   - async function refresh()              get the list, then call renderTable and renderSummary
//   - renderTable(list)                     build the table rows from the array the API returned
//   - renderSummary(list)                   update the summary cards
//   - applyFilter()                         re-render with the list filtered by category
//
// Don't forget:
//   - Show a Bootstrap spinner while a request is in flight.
//   - Wrap every fetch call in try/catch, and show a Bootstrap alert on failure.
//   - After add, edit, or delete, call refresh() so the page always shows
//     what the server actually saved - never update the table by hand.
//   - The API is at http://localhost:3000/api/expenses (see the Roadmap).

//const API_URL = "http://localhost:3000/api/expenses";















// Bootstrap alert popup

const timerInSeconds = 10;    //Alert dismiss timer

const alertPlaceholder = document.getElementById('liveAlertPlaceholder')

const appendAlert = (message, type) => {
    const wrapper = document.createElement('div')

    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible mt-2 fade show" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('')

    const alert = wrapper.firstElementChild
    alertPlaceholder.append(alert)

    setTimeout(() => {
        const bootstrapAlert = bootstrap.Alert.getOrCreateInstance(alert)
        bootstrapAlert.close()
    }, timerInSeconds * 1000)
}

const deleteExpenseTrigger = document.getElementById('confirm-delete')
if (deleteExpenseTrigger) {
    deleteExpenseTrigger.addEventListener('click', () => {
        appendAlert('The expense has been deleted successfully!', 'danger')
    })
}

const EditExpenseTrigger = document.getElementById('confirm-edit')
if (EditExpenseTrigger) {
    EditExpenseTrigger.addEventListener('click', () => {
        appendAlert('The expense has been updated successfully!', 'success')
    })
}