
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('../cate.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(JSON.stringify(data, null, 2));
} catch (e) {
    console.error("Error reading file:", e.message);
}
