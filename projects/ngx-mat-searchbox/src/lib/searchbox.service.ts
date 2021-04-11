import { Injectable } from '@angular/core';
import { SearchResult } from './searchbox.model';
import { isNumber, isNumeric, strip } from './searchbox.utils';

/**
 * Abstract class to be extended if custom search logic needs to be implemented, or the
 * SearchboxDefaultService can be extended
 */
export abstract class SearchboxService {
   abstract search(
    search: string,
    allResults: SearchResult[],
    lastFoundResult: SearchResult | undefined,
    searchMultiple: boolean,
    searchNextRow: boolean,
    searchCaseSensitive: boolean,
    searchStartsWith: boolean,
    searchRange: boolean,
    searchFrom: string,
    searchTo: string,
    searchExcludeChars: string[]
  ): SearchResult[];
}


/**
 * Default search service
 */
@Injectable()
export class SearchboxDefaultService extends SearchboxService {
  public search(
    search: string,
    allResults: SearchResult[],
    lastFoundResult: SearchResult | undefined,
    searchMultiple: boolean,
    searchNextRow: boolean,
    searchCaseSensitive: boolean,
    searchStartsWith: boolean,
    searchRange: boolean,
    searchFrom: string,
    searchTo: string,
    searchExcludeChars: string[]
  ): SearchResult[] {

    // if empty search string and not searching a range, nothing will be found
    if (!search.trim() && !searchRange) {
      return [];
    }

    // if last found then split array in two and reassemble, so we search from next element
    let unfiltered: SearchResult[] = allResults;
    if (lastFoundResult && !searchMultiple && unfiltered.length > 0) {
      const foundRowIndex = lastFoundResult?.rowIndex ?? -1;
      const foundColumnIndex = lastFoundResult?.columnIndex ?? -1;
      const arrayIndex = searchNextRow ?
        unfiltered.map(searchResult => searchResult.rowIndex).lastIndexOf(foundRowIndex) :
        unfiltered.findIndex(searchResult => searchResult.rowIndex === foundRowIndex && searchResult.columnIndex === foundColumnIndex);
      if (arrayIndex >= 0) {
        const lag = unfiltered.slice(0, arrayIndex + 1);
        const lead = unfiltered.slice(arrayIndex + 1);
        unfiltered = [...lead, ...lag];
      }
    }

    // filter
    let filtered: SearchResult[] = [];
    if (searchMultiple) {
      filtered = unfiltered.filter(result =>
        this.filter(result, search, searchCaseSensitive, searchStartsWith, searchRange, searchFrom, searchTo, searchExcludeChars));
    } else {
      const found = unfiltered.find(result =>
        this.filter(result, search, searchCaseSensitive, searchStartsWith, searchRange, searchFrom, searchTo, searchExcludeChars));
      filtered = found ? [found] : [];
    }

    // return search results
    return filtered;
  }

  protected filter(
    result: SearchResult, search: string, searchCaseSensitive: boolean, searchStartsWith: boolean,
    searchRange: boolean, searchFrom: string, searchTo: string, searchExcludeChars: string[]): boolean {
    // extract numeric
    const nvalue = isNumber(result.value) ? result.value as number : undefined;
    let svalue = isNumber(result.value) ? (result.value as number).toString() : result.value as string;
    if (!svalue) { return false; }
    svalue = !searchCaseSensitive ? svalue.toLowerCase() : svalue;
    const sfrom = !searchCaseSensitive ? searchFrom.toLowerCase() : searchFrom;
    const sto = !searchCaseSensitive ? searchTo.toLowerCase() : searchTo;

    // transform case of search string if can insensitive
    const ssearch = !searchCaseSensitive ? search.toLowerCase() : search;

    // get numeric value of search
    const nsearch = isNumeric(ssearch) ? Number(ssearch) : undefined;

    // numeric range
    if (searchRange && isNumeric(searchFrom) && isNumeric(searchTo) && nvalue) {
      return this.numericRange(nvalue, Number(searchFrom), Number(searchTo));
    }

    // numeric equals
    if (!searchRange && nvalue && nsearch) { return this.numericEquals(nvalue, nsearch); }

    // string range
    if (searchRange) { return this.stringRange(svalue, sfrom, sto, searchExcludeChars); }

    // string starts with
    if (!searchRange && searchStartsWith) { return this.stringStartsWith(svalue, ssearch, searchExcludeChars); }

    // string contains
    if (!searchRange && !searchStartsWith) { return this.stringContains(svalue, ssearch, searchExcludeChars); }

    return false;
  }

  protected numericRange(cellvalue: number, lower: number, upper: number): boolean {
    return cellvalue >= lower && cellvalue <= upper;
  }

  protected numericEquals(cellvalue: number, search: number): boolean { return cellvalue === search; }

  protected stringRange(cellvalue: string, lower: string, upper: string, searchExcludeChars: string[]): boolean {
    const scellvalue = strip(cellvalue, searchExcludeChars);
    return (scellvalue.localeCompare(lower) >= 0) &&
      (scellvalue.localeCompare(upper) <= 0);
  }

  protected stringStartsWith(cellvalue: string, search: string, searchExcludeChars: string[]): boolean {
    return strip(cellvalue, searchExcludeChars).startsWith(search);
  }

  protected stringContains(cellvalue: string, search: string, searchExcludeChars: string[]): boolean {
    return strip(cellvalue, searchExcludeChars).includes(search);
  }
}
