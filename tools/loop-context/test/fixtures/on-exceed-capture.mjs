import { writeFileSync } from 'node:fs';

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (data += chunk));
process.stdin.on('end', () => {
  writeFileSync(process.argv[2], data);
});
