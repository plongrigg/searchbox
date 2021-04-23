/**
 * Define a search datasource as an array of rows, each row possible containing multiple cells.  The search target needs
 * to deliver the data to be searched to this component in this format
 */
export type SearchCell = number | string | undefined;

export type SearchRow = SearchCell[];

export type SearchData = SearchRow[];

/**
 * Parameters used to effect a search
 */
export type SearchParams = {
  search: string;
  searchMultiple: boolean;
  searchNextRow: boolean;
  searchCaseSensitive: boolean;
  searchStartsWith: boolean;
  searchRange: boolean;
  searchFrom: string;
  searchTo: string;
  searchExcludeChars: string[];
};

/**
 * Result of a successful search match
 */
export type SearchResult = { rowIndex: number, columnIndex: number, value: number | string, searchRow?: SearchRow};

/**
 * Array of search results + searchParams
 */
export interface SearchResults extends Array<SearchResult> {
  searchParams?: SearchParams;
}

/**
 * Extended search options form changes
 */
export type ExtendedSearchChanges = {
  startsWith: boolean;
  caseSensitive: boolean;
  searchFrom: string;
  searchTo: string;
};

/**
 * UI terms by key, used for localization
 */
export type SearchTerms = {
  SEARCH_PLACEHOLDER?: string;
  SEARCH_RANGE_PLACEHOLDER?: string;
  SEARCH_STARTS_WITH?: string;
  SEARCH_STARTS_WITH_TOOLTIP?: string;
  SEARCH_CASE_SENSITIVE?: string;
  SEARCH_CASE_SENSITIVE_TOOLTIP?: string;
  SEARCH_FROM?: string;
  SEARCH_TO?: string;
  SEARCH_RANGE_LOWER?: string;
  SEARCH_RANGE_UPPER?: string;
  SEARCH_RANGE?: string;
};
