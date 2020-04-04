const fs = require('fs');
const path = require('path');
const os = require('os');

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);

beforeEach(() => {
    console.log(os.tmpdir());
});

test('adds 1 + 2 to equal 3', () => {
    expect(1 + 2).toBe(3);
});

test('test file', () => {
    const filepath = getFixturePath('content');
    fs.writeFileSync(filepath, 'Hello');
    fs.writeFileSync(path.join(os.tmpdir(), 'test.txt'), 'Hello');
    const result = fs.readFileSync(filepath, 'utf-8');
    expect(result).toBe('Hello');
});

// function functionWithException(n) {
//     if (n === 0) {
//         throw new Error('err');
//     }
//     return n;
// }
//
// test('boom!', () => {
//     try {
//         functionWithException(2);
//         expect(false).toBe(true);
//     } catch (e) {
//         expect(e).not.toBeNull();
//     }
// });
