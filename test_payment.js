import db from './src/database/db.js';
import { payRecurringExpense } from './src/services/recurringService.js';
import { getSummary } from './src/services/expenseService.js';

// Setup de teste
db.exec('DELETE FROM recurring_expenses');
db.exec('DELETE FROM transactions');

// 1. Criar uma conta fixa
const today = new Date();
const todayDate = today.getDate();
const tomorrow = todayDate < 28 ? todayDate + 1 : 1;

db.exec(`INSERT INTO recurring_expenses (amount, description, category, day_of_month, active) VALUES (150.50, 'Internet', '💻 Tecnologia', ${tomorrow}, 1)`);
db.exec(`INSERT INTO recurring_expenses (amount, description, category, day_of_month, active) VALUES (50.00, 'Spotify', '🎵 Lazer', ${tomorrow}, 1)`);
db.exec(`INSERT INTO transactions (amount, description, category, type) VALUES (20.00, 'Café', '🍞 Alimentação', 'expense')`);

console.log("=== ANTES DO PAGAMENTO ===");
console.log(getSummary());

console.log("\n=== EFETUANDO PAGAMENTO ===");
console.log(payRecurringExpense('Internet', 150.50));

console.log("\n=== DEPOIS DO PAGAMENTO ===");
console.log(getSummary());

console.log("\n=== PAGANDO NOVAMENTE (Deve falhar) ===");
console.log(payRecurringExpense('Internet', 150.50));

console.log("\n=== PAGANDO SPOTIFY SEM VALOR ===");
console.log(payRecurringExpense('Spotify'));

console.log("\n=== RESULTADO FINAL ===");
console.log(getSummary());

// Limpeza
db.exec('DELETE FROM recurring_expenses');
db.exec('DELETE FROM transactions');
