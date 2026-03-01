import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');

// Criar diretório data se não existir
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'expenses.db'));

// Criar tabela de transações (gastos e ganhos)
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migrar dados antigos se existir tabela expenses
try {
  const oldTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'").get();
  if (oldTableExists) {
    const oldData = db.prepare('SELECT * FROM expenses').all();
    if (oldData.length > 0) {
      const insertStmt = db.prepare('INSERT INTO transactions (amount, description, category, type, created_at) VALUES (?, ?, ?, ?, ?)');
      for (const row of oldData) {
        insertStmt.run(row.amount, row.description, row.category, 'expense', row.created_at);
      }
      console.log(`📦 Migrados ${oldData.length} registros antigos`);
    }
    db.exec('DROP TABLE expenses');
  }
} catch (e) {
  // Tabela já migrada ou não existe
}

// Funções CRUD
export function addTransaction(amount, description, category, type = 'expense') {
  const stmt = db.prepare('INSERT INTO transactions (amount, description, category, type) VALUES (?, ?, ?, ?)');
  const result = stmt.run(amount, description, category, type);
  return result.lastInsertRowid;
}

// Alias para compatibilidade
export function addExpense(amount, description, category) {
  return addTransaction(amount, description, category, 'expense');
}

export function addIncome(amount, description, category) {
  return addTransaction(amount, description, category, 'income');
}

export function getTotalExpenses() {
  const stmt = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'");
  return stmt.get().total;
}

export function getTotalIncome() {
  const stmt = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'");
  return stmt.get().total;
}

export function getBalance() {
  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  return income - expenses;
}

export function getTotal() {
  return getTotalExpenses(); // Para compatibilidade
}

export function getTotalByCategory() {
  const stmt = db.prepare(`
    SELECT category, type, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    GROUP BY category, type
    ORDER BY total DESC
  `);
  return stmt.all();
}

export function getExpensesByCategory() {
  const stmt = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'expense'
    GROUP BY category
    ORDER BY total DESC
  `);
  return stmt.all();
}

export function getIncomeByCategory() {
  const stmt = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'income'
    GROUP BY category
    ORDER BY total DESC
  `);
  return stmt.all();
}

export function getTotalThisMonth() {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'expense' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `);
  return stmt.get().total;
}

export function getIncomeThisMonth() {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'income' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
  `);
  return stmt.get().total;
}

export function getRecentTransactions(limit = 10) {
  const stmt = db.prepare(`
    SELECT * FROM transactions
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit);
}

// Alias para compatibilidade
export function getRecentExpenses(limit = 10) {
  return getRecentTransactions(limit);
}

export function clearAllTransactions() {
  const stmt = db.prepare('DELETE FROM transactions');
  return stmt.run().changes;
}

// Alias para compatibilidade
export function clearAllExpenses() {
  return clearAllTransactions();
}

export function deleteLastTransaction() {
  const lastTransaction = db.prepare('SELECT * FROM transactions ORDER BY id DESC LIMIT 1').get();
  if (lastTransaction) {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(lastTransaction.id);
    return lastTransaction;
  }
  return null;
}

// Alias para compatibilidade
export function deleteLastExpense() {
  return deleteLastTransaction();
}

// ==========================================
// ORÇAMENTO / BUDGET
// ==========================================

// Criar tabela de orçamentos
db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'geral',
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, month)
  )
`);

/**
 * Define ou atualiza um orçamento
 */
export function setBudget(amount, category = 'geral') {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const stmt = db.prepare(`
    INSERT INTO budgets (category, amount, month) 
    VALUES (?, ?, ?)
    ON CONFLICT(category, month) DO UPDATE SET amount = ?
  `);
  stmt.run(category.toLowerCase(), amount, month, amount);
  return { category, amount, month };
}

/**
 * Obtém todos os orçamentos do mês atual
 */
export function getBudgets() {
  const month = new Date().toISOString().slice(0, 7);
  const stmt = db.prepare('SELECT * FROM budgets WHERE month = ?');
  return stmt.all(month);
}

/**
 * Obtém orçamento de uma categoria específica
 */
export function getBudgetByCategory(category = 'geral') {
  const month = new Date().toISOString().slice(0, 7);
  const stmt = db.prepare('SELECT * FROM budgets WHERE category = ? AND month = ?');
  return stmt.get(category.toLowerCase(), month);
}

/**
 * Remove um orçamento
 */
export function removeBudget(category = 'geral') {
  const month = new Date().toISOString().slice(0, 7);
  const stmt = db.prepare('DELETE FROM budgets WHERE category = ? AND month = ?');
  return stmt.run(category.toLowerCase(), month).changes;
}

// ==========================================
// CONSULTA POR PERÍODO
// ==========================================

/**
 * Obtém gastos de um mês específico
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano (opcional, padrão: ano atual)
 */
export function getExpensesByMonth(month, year = new Date().getFullYear()) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'expense' AND strftime('%Y-%m', created_at) = ?
  `);
  return stmt.get(monthStr).total;
}

/**
 * Obtém ganhos de um mês específico
 */
export function getIncomeByMonth(month, year = new Date().getFullYear()) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'income' AND strftime('%Y-%m', created_at) = ?
  `);
  return stmt.get(monthStr).total;
}

/**
 * Obtém transações de um mês específico
 */
export function getTransactionsByMonth(month, year = new Date().getFullYear()) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const stmt = db.prepare(`
    SELECT * FROM transactions
    WHERE strftime('%Y-%m', created_at) = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(monthStr);
}

/**
 * Obtém gastos da última semana
 */
export function getExpensesThisWeek() {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'expense' 
    AND created_at >= datetime('now', '-7 days', 'localtime')
  `);
  return stmt.get().total;
}

/**
 * Obtém ganhos da última semana
 */
export function getIncomeThisWeek() {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'income' 
    AND created_at >= datetime('now', '-7 days', 'localtime')
  `);
  return stmt.get().total;
}

/**
 * Obtém transações da última semana
 */
export function getTransactionsThisWeek() {
  const stmt = db.prepare(`
    SELECT * FROM transactions
    WHERE created_at >= datetime('now', '-7 days', 'localtime')
    ORDER BY created_at DESC
  `);
  return stmt.all();
}

/**
 * Obtém gastos por categoria de um mês específico
 */
export function getExpensesByCategoryForMonth(month, year = new Date().getFullYear()) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const stmt = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'expense' AND strftime('%Y-%m', created_at) = ?
    GROUP BY category
    ORDER BY total DESC
  `);
  return stmt.all(monthStr);
}

// ==========================================
// CONSULTA POR DIA ESPECÍFICO
// ==========================================

/**
 * Obtém gastos de um dia específico
 * @param {string} dateStr - Data no formato 'YYYY-MM-DD'
 */
export function getExpensesByDay(dateStr) {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'expense' AND date(created_at) = date(?)
  `);
  return stmt.get(dateStr).total;
}

/**
 * Obtém ganhos de um dia específico
 */
export function getIncomeByDay(dateStr) {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE type = 'income' AND date(created_at) = date(?)
  `);
  return stmt.get(dateStr).total;
}

/**
 * Obtém gastos por categoria de um dia específico
 */
export function getExpensesByCategoryForDay(dateStr) {
  const stmt = db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'expense' AND date(created_at) = date(?)
    GROUP BY category
    ORDER BY total DESC
  `);
  return stmt.all(dateStr);
}

/**
 * Obtém todas as transações de um dia específico
 */
export function getTransactionsByDay(dateStr) {
  const stmt = db.prepare(`
    SELECT * FROM transactions
    WHERE date(created_at) = date(?)
    ORDER BY created_at DESC
  `);
  return stmt.all(dateStr);
}

// ==========================================
// GASTOS RECORRENTES
// ==========================================

// Criar tabela de gastos recorrentes
db.exec(`
  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    day_of_month INTEGER NOT NULL,
    active INTEGER DEFAULT 1,
    last_processed TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * Adiciona um gasto recorrente
 */
export function addRecurringExpense(amount, description, category, dayOfMonth) {
  const stmt = db.prepare(`
    INSERT INTO recurring_expenses (amount, description, category, day_of_month)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(amount, description, category, dayOfMonth).lastInsertRowid;
}

/**
 * Lista gastos recorrentes ativos
 */
export function getRecurringExpenses() {
  const stmt = db.prepare('SELECT * FROM recurring_expenses WHERE active = 1 ORDER BY day_of_month');
  return stmt.all();
}

/**
 * Remove (desativa) um gasto recorrente
 */
export function removeRecurringExpense(id) {
  const stmt = db.prepare('UPDATE recurring_expenses SET active = 0 WHERE id = ?');
  return stmt.run(id).changes;
}

/**
 * Remove gasto recorrente por descrição
 */
export function removeRecurringExpenseByDescription(description) {
  const stmt = db.prepare(`
    UPDATE recurring_expenses SET active = 0 
    WHERE active = 1 AND LOWER(description) LIKE ?
  `);
  return stmt.run(`%${description.toLowerCase()}%`).changes;
}

/**
 * Obtém gastos recorrentes que precisam ser processados hoje
 */
export function getRecurringToProcess() {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const currentMonth = today.toISOString().slice(0, 7);

  const stmt = db.prepare(`
    SELECT * FROM recurring_expenses 
    WHERE active = 1 
    AND day_of_month = ?
    AND (last_processed IS NULL OR last_processed != ?)
  `);
  return stmt.all(dayOfMonth, currentMonth);
}

/**
 * Marca gasto recorrente como processado
 */
export function markRecurringAsProcessed(id) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const stmt = db.prepare('UPDATE recurring_expenses SET last_processed = ? WHERE id = ?');
  return stmt.run(currentMonth, id);
}

// ==========================================
// METAS DE ECONOMIA
// ==========================================

// Criar tabela de metas
db.exec(`
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * Adiciona uma meta
 */
export function addGoal(name, targetAmount, deadline = null) {
  const stmt = db.prepare(`
    INSERT INTO goals (name, target_amount, deadline)
    VALUES (?, ?, ?)
  `);
  return stmt.run(name, targetAmount, deadline).lastInsertRowid;
}

/**
 * Lista metas ativas
 */
export function getGoals() {
  const stmt = db.prepare('SELECT * FROM goals WHERE active = 1 ORDER BY created_at DESC');
  return stmt.all();
}

/**
 * Atualiza progresso de uma meta
 */
export function updateGoalProgress(id, amount) {
  const stmt = db.prepare('UPDATE goals SET current_amount = current_amount + ? WHERE id = ?');
  return stmt.run(amount, id).changes;
}

/**
 * Define valor absoluto para uma meta
 */
export function setGoalProgress(id, amount) {
  const stmt = db.prepare('UPDATE goals SET current_amount = ? WHERE id = ?');
  return stmt.run(amount, id).changes;
}

/**
 * Remove (desativa) uma meta
 */
export function removeGoal(id) {
  const stmt = db.prepare('UPDATE goals SET active = 0 WHERE id = ?');
  return stmt.run(id).changes;
}

/**
 * Remove meta por nome
 */
export function removeGoalByName(name) {
  const stmt = db.prepare(`
    UPDATE goals SET active = 0 
    WHERE active = 1 AND LOWER(name) LIKE ?
  `);
  return stmt.run(`%${name.toLowerCase()}%`).changes;
}

/**
 * Obtém uma meta pelo ID
 */
export function getGoalById(id) {
  const stmt = db.prepare('SELECT * FROM goals WHERE id = ?');
  return stmt.get(id);
}

export default db;

