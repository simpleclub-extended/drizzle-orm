import type { GoogleSQLColumn } from '~/google-sql-core/columns/index.ts';
import type { GoogleSQLTable, GoogleSQLTableWithColumns } from '~/google-sql-core/table.ts';
import type { GoogleSQLViewBase } from '~/google-sql-core/view-base.ts';
import type { GoogleSQLViewWithSelection } from '~/google-sql-core/view.ts';
import type {
	SelectedFields as SelectedFieldsBase,
	SelectedFieldsFlat as SelectedFieldsFlatBase,
	SelectedFieldsOrdered as SelectedFieldsOrderedBase,
} from '~/operations.ts';
import type { TypedQueryBuilder } from '~/query-builders/query-builder.ts';
import type {
	AppendToNullabilityMap,
	AppendToResult,
	BuildSubquerySelection,
	GetSelectTableName,
	JoinNullability,
	JoinType,
	MapColumnsToTableAlias,
	SelectMode,
	SelectResult,
	SetOperator,
} from '~/query-builders/select.types.ts';
import type { ColumnsSelection, Placeholder, SQL, View } from '~/sql/sql.ts';
import type { Subquery } from '~/subquery.ts';
import type { Table, UpdateTableConfig } from '~/table.ts';
import type { Assume, DrizzleTypeError, Equal, ValidateShape } from '~/utils.ts';
import type { GoogleSQLPreparedQuery, PreparedQueryConfig } from '../session.ts';
import type { GoogleSQLSelectBase, GoogleSQLSelectQueryBuilderBase } from './select.ts';

export interface GoogleSQLSelectJoinConfig {
	on: SQL | undefined;
	table: GoogleSQLTable | Subquery | GoogleSQLViewBase | SQL;
	alias: string | undefined;
	joinType: JoinType;
}

export type BuildAliasTable<TTable extends GoogleSQLTable | View, TAlias extends string> = TTable extends Table
	? GoogleSQLTableWithColumns<
		UpdateTableConfig<TTable['_'], {
			name: TAlias;
			columns: MapColumnsToTableAlias<TTable['_']['columns'], TAlias, 'google-sql'>;
		}>
	>
	: TTable extends View ? GoogleSQLViewWithSelection<
			TAlias,
			TTable['_']['existing'],
			MapColumnsToTableAlias<TTable['_']['selectedFields'], TAlias, 'google-sql'>
		>
	: never;

export interface GoogleSQLSelectConfig {
	withList?: Subquery[];
	// Either fields or fieldsFlat must be defined
	fields: Record<string, unknown>;
	fieldsFlat?: SelectedFieldsOrdered;
	where?: SQL;
	having?: SQL;
	table: GoogleSQLTable | Subquery | GoogleSQLViewBase | SQL;
	limit?: number | Placeholder;
	offset?: number | Placeholder;
	joins?: GoogleSQLSelectJoinConfig[];
	orderBy?: (GoogleSQLColumn | SQL | SQL.Aliased)[];
	groupBy?: (GoogleSQLColumn | SQL | SQL.Aliased)[];
	lockForUpdate?: boolean;
	distinct?: boolean;
	setOperators: {
		rightSelect: TypedQueryBuilder<any, any>;
		type: SetOperator;
		isAll: boolean;
		orderBy?: (GoogleSQLColumn | SQL | SQL.Aliased)[];
		limit?: number | Placeholder;
		offset?: number | Placeholder;
	}[];
}

export type TableLikeHasEmptySelection<T extends GoogleSQLTable | Subquery | GoogleSQLViewBase | SQL> = T extends
	Subquery ? Equal<T['_']['selectedFields'], {}> extends true ? true : false
	: false;

export type GoogleSQLSelectJoin<
	T extends AnyGoogleSQLSelectQueryBuilder,
	TDynamic extends boolean,
	TJoinType extends JoinType,
	TJoinedTable extends GoogleSQLTable | Subquery | GoogleSQLViewBase | SQL,
	TJoinedName extends GetSelectTableName<TJoinedTable> = GetSelectTableName<TJoinedTable>,
> = T extends any ? GoogleSQLSelectWithout<
		GoogleSQLSelectKind<
			T['_']['hkt'],
			T['_']['tableName'],
			AppendToResult<
				T['_']['tableName'],
				T['_']['selection'],
				TJoinedName,
				TJoinedTable extends Table ? TJoinedTable['_']['columns']
					: TJoinedTable extends Subquery | View ? Assume<TJoinedTable['_']['selectedFields'], SelectedFields>
					: never,
				T['_']['selectMode']
			>,
			T['_']['selectMode'] extends 'partial' ? T['_']['selectMode'] : 'multiple',
			AppendToNullabilityMap<T['_']['nullabilityMap'], TJoinedName, TJoinType>,
			T['_']['dynamic'],
			T['_']['excludedMethods']
		>,
		TDynamic,
		T['_']['excludedMethods']
	>
	: never;

export type GoogleSQLSelectJoinFn<
	T extends AnyGoogleSQLSelectQueryBuilder,
	TDynamic extends boolean,
	TJoinType extends JoinType,
> = <
	TJoinedTable extends GoogleSQLTable | Subquery | GoogleSQLViewBase | SQL,
	TJoinedName extends GetSelectTableName<TJoinedTable> = GetSelectTableName<TJoinedTable>,
>(
	table: TableLikeHasEmptySelection<TJoinedTable> extends true ? DrizzleTypeError<
			"Cannot reference a data-modifying statement subquery if it doesn't contain a `returning` clause"
		>
		: TJoinedTable,
	on: ((aliases: T['_']['selection']) => SQL | undefined) | SQL | undefined,
) => GoogleSQLSelectJoin<T, TDynamic, TJoinType, TJoinedTable, TJoinedName>;

export type GoogleSQLSelectCrossJoinFn<
	T extends AnyGoogleSQLSelectQueryBuilder,
	TDynamic extends boolean,
> = <
	TJoinedTable extends GoogleSQLTable | Subquery | GoogleSQLViewBase | SQL,
	TJoinedName extends GetSelectTableName<TJoinedTable> = GetSelectTableName<TJoinedTable>,
>(
	table: TableLikeHasEmptySelection<TJoinedTable> extends true ? DrizzleTypeError<
			"Cannot reference a data-modifying statement subquery if it doesn't contain a `returning` clause"
		>
		: TJoinedTable,
) => GoogleSQLSelectJoin<T, TDynamic, 'cross', TJoinedTable, TJoinedName>;

export type SelectedFieldsFlat = SelectedFieldsFlatBase<GoogleSQLColumn>;

export type SelectedFields = SelectedFieldsBase<GoogleSQLColumn, GoogleSQLTable>;

export type SelectedFieldsOrdered = SelectedFieldsOrderedBase<GoogleSQLColumn>;

export interface GoogleSQLSelectHKTBase {
	tableName: string | undefined;
	selection: unknown;
	selectMode: SelectMode;
	nullabilityMap: unknown;
	dynamic: boolean;
	excludedMethods: string;
	result: unknown;
	selectedFields: unknown;
	_type: unknown;
}

export type GoogleSQLSelectKind<
	T extends GoogleSQLSelectHKTBase,
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TNullabilityMap extends Record<string, JoinNullability>,
	TDynamic extends boolean,
	TExcludedMethods extends string,
	TResult = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields = BuildSubquerySelection<TSelection, TNullabilityMap>,
> = (T & {
	tableName: TTableName;
	selection: TSelection;
	selectMode: TSelectMode;
	nullabilityMap: TNullabilityMap;
	dynamic: TDynamic;
	excludedMethods: TExcludedMethods;
	result: TResult;
	selectedFields: TSelectedFields;
})['_type'];

export interface GoogleSQLSelectQueryBuilderHKT extends GoogleSQLSelectHKTBase {
	_type: GoogleSQLSelectQueryBuilderBase<
		GoogleSQLSelectQueryBuilderHKT,
		this['tableName'],
		Assume<this['selection'], ColumnsSelection>,
		this['selectMode'],
		Assume<this['nullabilityMap'], Record<string, JoinNullability>>,
		this['dynamic'],
		this['excludedMethods'],
		Assume<this['result'], any[]>,
		Assume<this['selectedFields'], ColumnsSelection>
	>;
}

export interface GoogleSQLSelectHKT extends GoogleSQLSelectHKTBase {
	_type: GoogleSQLSelectBase<
		this['tableName'],
		Assume<this['selection'], ColumnsSelection>,
		this['selectMode'],
		Assume<this['nullabilityMap'], Record<string, JoinNullability>>,
		this['dynamic'],
		this['excludedMethods'],
		Assume<this['result'], any[]>,
		Assume<this['selectedFields'], ColumnsSelection>
	>;
}

export type CreateGoogleSQLSelectFromBuilderMode<
	TBuilderMode extends 'db' | 'qb',
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
> = TBuilderMode extends 'db' ? GoogleSQLSelectBase<TTableName, TSelection, TSelectMode>
	: GoogleSQLSelectQueryBuilderBase<GoogleSQLSelectQueryBuilderHKT, TTableName, TSelection, TSelectMode>;

export type GoogleSQLSetOperatorExcludedMethods =
	| 'leftJoin'
	| 'rightJoin'
	| 'innerJoin'
	| 'fullJoin'
	| 'where'
	| 'having'
	| 'groupBy';

export type GoogleSQLSelectWithout<
	T extends AnyGoogleSQLSelectQueryBuilder,
	TDynamic extends boolean,
	K extends keyof T & string,
	TResetExcluded extends boolean = false,
> = TDynamic extends true ? T : Omit<
	GoogleSQLSelectKind<
		T['_']['hkt'],
		T['_']['tableName'],
		T['_']['selection'],
		T['_']['selectMode'],
		T['_']['nullabilityMap'],
		TDynamic,
		TResetExcluded extends true ? K : T['_']['excludedMethods'] | K,
		T['_']['result'],
		T['_']['selectedFields']
	>,
	TResetExcluded extends true ? K : T['_']['excludedMethods'] | K
>;

export type GoogleSQLSelectPrepare<T extends AnyGoogleSQLSelect> = GoogleSQLPreparedQuery<
	PreparedQueryConfig & {
		execute: T['_']['result'];
	}
>;

export type GoogleSQLSelectDynamic<T extends AnyGoogleSQLSelectQueryBuilder> = GoogleSQLSelectKind<
	T['_']['hkt'],
	T['_']['tableName'],
	T['_']['selection'],
	T['_']['selectMode'],
	T['_']['nullabilityMap'],
	true,
	never,
	T['_']['result'],
	T['_']['selectedFields']
>;

export type GoogleSQLSelectQueryBuilder<
	THKT extends GoogleSQLSelectHKTBase = GoogleSQLSelectQueryBuilderHKT,
	TTableName extends string | undefined = string | undefined,
	TSelection extends ColumnsSelection = ColumnsSelection,
	TSelectMode extends SelectMode = SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
	TResult extends any[] = unknown[],
	TSelectedFields extends ColumnsSelection = ColumnsSelection,
> = GoogleSQLSelectQueryBuilderBase<
	THKT,
	TTableName,
	TSelection,
	TSelectMode,
	TNullabilityMap,
	true,
	never,
	TResult,
	TSelectedFields
>;

export type AnyGoogleSQLSelectQueryBuilder = GoogleSQLSelectQueryBuilderBase<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type AnyGoogleSQLSetOperatorInterface = GoogleSQLSetOperatorInterface<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export interface GoogleSQLSetOperatorInterface<
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = TTableName extends string ? Record<TTableName, 'not-null'>
		: {},
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
	TResult extends any[] = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields extends ColumnsSelection = BuildSubquerySelection<TSelection, TNullabilityMap>,
> {
	_: {
		readonly hkt: GoogleSQLSelectHKT;
		readonly tableName: TTableName;
		readonly selection: TSelection;
		readonly selectMode: TSelectMode;
		readonly nullabilityMap: TNullabilityMap;
		readonly dynamic: TDynamic;
		readonly excludedMethods: TExcludedMethods;
		readonly result: TResult;
		readonly selectedFields: TSelectedFields;
	};
}

export type GoogleSQLSetOperatorWithResult<TResult extends any[]> = GoogleSQLSetOperatorInterface<
	any,
	any,
	any,
	any,
	any,
	any,
	TResult,
	any
>;

export type GoogleSQLSelect<
	TTableName extends string | undefined = string | undefined,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
> = GoogleSQLSelectBase<TTableName, TSelection, TSelectMode, TNullabilityMap, true, never>;

export type AnyGoogleSQLSelect = GoogleSQLSelectBase<any, any, any, any, any, any, any, any>;

export type GoogleSQLSetOperator<
	TTableName extends string | undefined = string | undefined,
	TSelection extends ColumnsSelection = Record<string, any>,
	TSelectMode extends SelectMode = SelectMode,
	TNullabilityMap extends Record<string, JoinNullability> = Record<string, JoinNullability>,
> = GoogleSQLSelectBase<
	TTableName,
	TSelection,
	TSelectMode,
	TNullabilityMap,
	true,
	GoogleSQLSetOperatorExcludedMethods
>;

export type SetOperatorRightSelect<
	TValue extends GoogleSQLSetOperatorWithResult<TResult>,
	TResult extends any[],
> = TValue extends GoogleSQLSetOperatorInterface<any, any, any, any, any, any, infer TValueResult, any> ? ValidateShape<
		TValueResult[number],
		TResult[number],
		TypedQueryBuilder<any, TValueResult>
	>
	: TValue;

export type SetOperatorRestSelect<
	TValue extends readonly GoogleSQLSetOperatorWithResult<TResult>[],
	TResult extends any[],
> = TValue extends [infer First, ...infer Rest]
	? First extends GoogleSQLSetOperatorInterface<any, any, any, any, any, any, infer TValueResult, any>
		? Rest extends AnyGoogleSQLSetOperatorInterface[] ? [
				ValidateShape<TValueResult[number], TResult[number], TypedQueryBuilder<any, TValueResult>>,
				...SetOperatorRestSelect<Rest, TResult>,
			]
		: ValidateShape<TValueResult[number], TResult[number], TypedQueryBuilder<any, TValueResult>[]>
	: never
	: TValue;

export type GoogleSQLCreateSetOperatorFn = <
	TTableName extends string | undefined,
	TSelection extends ColumnsSelection,
	TSelectMode extends SelectMode,
	TValue extends GoogleSQLSetOperatorWithResult<TResult>,
	TRest extends GoogleSQLSetOperatorWithResult<TResult>[],
	TNullabilityMap extends Record<string, JoinNullability> = TTableName extends string ? Record<TTableName, 'not-null'>
		: {},
	TDynamic extends boolean = false,
	TExcludedMethods extends string = never,
	TResult extends any[] = SelectResult<TSelection, TSelectMode, TNullabilityMap>[],
	TSelectedFields extends ColumnsSelection = BuildSubquerySelection<TSelection, TNullabilityMap>,
>(
	leftSelect: GoogleSQLSetOperatorInterface<
		TTableName,
		TSelection,
		TSelectMode,
		TNullabilityMap,
		TDynamic,
		TExcludedMethods,
		TResult,
		TSelectedFields
	>,
	rightSelect: SetOperatorRightSelect<TValue, TResult>,
	...restSelects: SetOperatorRestSelect<TRest, TResult>
) => GoogleSQLSelectWithout<
	GoogleSQLSelectBase<
		TTableName,
		TSelection,
		TSelectMode,
		TNullabilityMap,
		TDynamic,
		TExcludedMethods,
		TResult,
		TSelectedFields
	>,
	false,
	GoogleSQLSetOperatorExcludedMethods,
	true
>;

export type GetGoogleSQLSetOperators = {
	union: GoogleSQLCreateSetOperatorFn;
	intersect: GoogleSQLCreateSetOperatorFn;
	except: GoogleSQLCreateSetOperatorFn;
	unionAll: GoogleSQLCreateSetOperatorFn;
	intersectAll: GoogleSQLCreateSetOperatorFn;
	exceptAll: GoogleSQLCreateSetOperatorFn;
};
