# Formula function catalog

SheetGrid formulas are **opt-in** (`formulas` prop). The engine is an allowlist AST evaluator: no `eval`, no network, no host APIs.

Enable and security defaults: [Formulas recipe](recipes/09-formulas.md).

List names at runtime:

```ts
import { listFunctions, getFunction } from "@sheetgrid/core";
console.log(listFunctions());
```

Names are case-insensitive in formulas (`=sum(A1:A3)` works).

---

## Logical

| Function | Summary |
|----------|---------|
| `IF(cond, whenTrue, whenFalse?)` | Branch |
| `IFS(c1, v1, …)` | Multi-branch |
| `IFERROR(value, fallback)` | Catch errors |
| `IFNA(value, fallback)` | Catch `#N/A` |
| `AND(…)` | All truthy |
| `OR(…)` | Any truthy |
| `XOR(…)` | Exclusive or |
| `NOT(value)` | Negate |
| `TRUE()` / `FALSE()` | Booleans |
| `SWITCH(expr, case1, val1, …, default?)` | Match expression |

## Math

| Function | Summary |
|----------|---------|
| `ABS`, `SIGN` | Absolute / sign |
| `ROUND`, `ROUNDUP`, `ROUNDDOWN` | Rounding |
| `FLOOR`, `CEILING`, `INT`, `TRUNC` | Floor-style |
| `MOD`, `POWER`, `SQRT`, `EXP` | Arithmetic |
| `LN`, `LOG`, `LOG10` | Logs |
| `PI` | π |
| `SIN`, `COS`, `TAN`, `ASIN`, `ACOS`, `ATAN`, `ATAN2` | Trig |
| `DEGREES`, `RADIANS` | Angle convert |
| `MIN`, `MAX`, `SUM`, `PRODUCT`, `SUMPRODUCT` | Aggregates |
| `GCD`, `LCM` | Integer |
| `COMBIN`, `PERMUT`, `FACT` | Combinatorics (`FACT` capped by limits) |
| `AVERAGE`, `COUNT`, `COUNTA`, `COUNTBLANK` | Stats-lite |
| `RAND`, `RANDBETWEEN` | Volatile random (`allowVolatile`) |

## Statistics

| Function | Summary |
|----------|---------|
| `MEDIAN`, `MODE` | Central tendency |
| `LARGE`, `SMALL` | Order statistics |
| `RANK`, `PERCENTILE`, `QUARTILE` | Rank / distribution |
| `STDEV`, `STDEVP`, `VAR`, `VARP` | Variance family |
| `SUMIF`, `SUMIFS` | Conditional sum |
| `COUNTIF`, `COUNTIFS` | Conditional count |
| `AVERAGEIF`, `AVERAGEIFS` | Conditional average |

## Text

| Function | Summary |
|----------|---------|
| `LEN`, `LEFT`, `RIGHT`, `MID` | Length / slices |
| `UPPER`, `LOWER`, `PROPER` | Case |
| `TRIM`, `CLEAN` | Whitespace / non-printables |
| `CONCAT`, `CONCATENATE`, `TEXTJOIN` | Join |
| `REPLACE`, `SUBSTITUTE` | Rewrite |
| `FIND`, `SEARCH` | Locate (SEARCH case-insensitive) |
| `EXACT` | Case-sensitive equality |
| `REPT` | Repeat |
| `TEXT`, `VALUE`, `T` | Coerce / format |
| `CHAR`, `CODE` | Code points |

## Information

| Function | Summary |
|----------|---------|
| `ISBLANK`, `ISNUMBER`, `ISTEXT`, `ISLOGICAL` | Type tests |
| `ISERROR`, `ISERR`, `ISNA` | Error tests |
| `TYPE`, `N`, `NA`, `ERROR.TYPE` | Type / NA / error codes |

## Lookup & reference

| Function | Summary |
|----------|---------|
| `INDEX`, `MATCH` | Classic pair |
| `VLOOKUP`, `HLOOKUP`, `XLOOKUP`, `LOOKUP` | Table lookup |
| `CHOOSE` | Pick by index |
| `ROW`, `COLUMN`, `ROWS`, `COLUMNS` | Position / size |
| `ADDRESS` | Build A1 text |
| `OFFSET` | Shifted range (`maxOffsetSize` limit) |
| `INDIRECT` | Text → ref (**off** unless `allowIndirect`) |

## Date & time

| Function | Summary |
|----------|---------|
| `DATE`, `TIME`, `DATEVALUE`, `TIMEVALUE` | Construct / parse |
| `NOW`, `TODAY` | Volatile clock (`allowVolatile`) |
| `YEAR`, `MONTH`, `DAY`, `HOUR`, `MINUTE`, `SECOND` | Parts |
| `WEEKDAY`, `WEEKNUM` | Calendar |
| `EDATE`, `EOMONTH` | Month arithmetic |
| `DATEDIF`, `YEARFRAC` | Spans |
| `WORKDAY`, `NETWORKDAYS` | Business days |

## Financial

| Function | Summary |
|----------|---------|
| `PMT`, `PV`, `FV`, `NPER`, `RATE` | Annuity family |
| `IPMT`, `PPMT` | Payment interest / principal |
| `NPV`, `IRR` | Cash flows |

---

## Errors

Displayed / returned as formula errors (not thrown as JS):

| Code | Typical cause |
|------|----------------|
| `#DIV/0!` | Division by zero |
| `#VALUE!` | Wrong type / coercion |
| `#REF!` | Bad reference / blocked `INDIRECT` |
| `#NAME?` | Unknown function |
| `#N/A` | Lookup miss / `NA()` |
| `#NUM!` | Domain (e.g. `SQRT(-1)`) |
| `#CYCLE!` | Circular dependency |
| `#LIMIT!` | Safety limit exceeded |
| *(parse)* | Syntax error |

## Safety limits (defaults)

Override via `formulaLimits` on `<Grid>` or `formulaOptions.limits` on the store:

| Limit | Default |
|-------|---------|
| `maxSourceLength` | 10_000 |
| `maxTokens` | 2_000 |
| `maxAstDepth` | 64 |
| `maxRangeCells` | 100_000 |
| `maxCellsTouched` | 500_000 |
| `maxStringLength` | 32_768 |
| `maxFactN` | 170 |
| `maxOffsetSize` | 10_000 |
| `maxEvalMsPerCell` | 50 |
| `maxEvalMsPerBatch` | 2_000 |

## References

- A1 over **current** column order and row order: `A1`, `$B$2`, `A1:C10`
- Sheet qualifiers (`Sheet1!A1`) are **rejected**
- Sort is display-only; formula addresses use **source** row order

## Related

- [Formulas recipe](recipes/09-formulas.md)
- [API reference — formula props](api.md#formulas)
- [Core store formula API](core-guide.md#formulas-on-the-store)
