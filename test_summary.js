import db, { getPendingRecurringThisMonth } from './src/database/db.js';
import { getSummary, getMonthSummary } from './src/services/expenseService.js';

// Adicionar conta pendente (dia 30) e conta já processada hoje (ou dia menor)
// Supondo hoje é dia 4 (conforme Date.getDate())
const today = new Date();
const todayDate = today.getDate();
const tomorrow = todayDate < 28 ? todayDate + 1 : 1;

db.exec(`INSERT INTO recurring_expenses (amount, description, category, day_of_month, active) VALUES (150.50, 'Internet', '💻 Tecnologia', ${tomorrow}, 1)`);
db.exec(`INSERT INTO recurring_expenses (amount, description, category, day_of_month, active) VALUES (50.00, 'Spotify', '🎵 Lazer', ${tomorrow}, 1)`);

console.log("=== PENDENTES ===");
console.log(getPendingRecurringThisMonth());

console.log("\n=== SUMMARY ===");
console.log(getSummary());

console.log("\n=== MONTH SUMMARY ===");
console.log(getMonthSummary());

db.exec("DELETE FROM recurring_expenses WHERE description IN ('Internet', 'Spotify')");
