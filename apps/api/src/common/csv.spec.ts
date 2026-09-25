import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a BOM, header and CRLF rows', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a,b\r\n1,x\r\n');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['n'], [['a,b'], ['say "hi"'], ['l1\nl2']])).toBe('﻿n\r\n"a,b"\r\n"say ""hi"""\r\n"l1\nl2"\r\n');
  });

  it('neutralises spreadsheet formulas in text cells but not negative numbers', () => {
    expect(toCsv(['n'], [['=SUM(A1)'], [-5]])).toBe("﻿n\r\n'=SUM(A1)\r\n-5\r\n");
  });

  it('writes null and undefined as empty cells', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('﻿a,b\r\n,\r\n');
  });
});
