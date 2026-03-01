export * from './bool.ts';
export * from './bytes.ts';
export * from './common.ts';
export * from './custom.ts';
export * from './date.common.ts';
export * from './date.ts';
export * from './float32.ts';
export * from './float64.ts';
export * from './int64.ts';
export * from './json.ts';
export * from './numeric.ts';
export * from './string.ts';
export * from './timestamp.ts';
export * from './uuid.ts';

/*
todo: For checking types the return types of all columns:
{
    bool_col: true,
    float32_col: Float32 { value: 3.4028234663852886e+38 },
    float64_col: Float { value: 'NaN' },
    numeric_col: Numeric { value: '-99999999999999999999999999999.999999999' },
    string_col: 'A very very very very very long string',
    string_col_restricted: 'Some strin',
    json_col: { foo: 'bar' },
    bytes_col: <Buffer 48 65 6c 6c 6f 20 47 65 6d 69 6e 69 21>,
    date_col: SpannerDate 2026-03-01T23:00:00.000Z,
    timestamp_col: 2026-03-01T15:30:00.000Z,
    array_type: [ 'foo', 'bar' ],
    uuid_type: 'f4c394ec-88e5-4ae3-bc41-624baa8097e2',
    int64_col: Int { value: '-9223372036854775808' }
}
 */
