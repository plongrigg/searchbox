import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { plusImage, searchImage } from './searchbox.images';
import { ExtendedSearchChanges, SearchData, SearchResult, SearchTerms } from './searchbox.model';
import { enableControls, isNumber, isNumeric, strip } from './searchbox.utils';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ngx-mat-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class NgxMatSearchboxComponent implements OnInit, OnDestroy {
  /**
   * Data source for search
   */
  private searchDataSource: SearchData = [];

  private allResults: SearchResult[] = [];

  @Input()
  public get searchData(): SearchData { return this.searchDataSource; }
  public set searchData(searchDataSource: SearchData) {
    this.searchDataSource = searchDataSource;

    // flatten [][] into SearchResult[]
    this.allResults = searchDataSource
      .map((row, rowIndex) => row.map((cell, columnIndex) => ({ rowIndex, columnIndex, value: cell ?? '' }))).flat(1);

    // determine if the last found result is the same in the new data set
    // else if it has changed then initialize last found, so any new search start from beginning
    if (this.lastFoundResult) {
      const newCellValue = this.searchCellValue(this.lastFoundResult.rowIndex, this.lastFoundResult.columnIndex);
      if (newCellValue !== this.lastFoundResult.value) { this.lastFoundResult = undefined; }
    }
  }

  /**
   * Determines if search happens on each key stroke or only when search button is clicked (or on enter key stoke)
   */
  @Input() private searchContinuous = true;

  /**
   * Localization
   */
  private standardTerms: SearchTerms = {
    SEARCH_PLACEHOLDER: 'Search',
    SEARCH_RANGE_PLACEHOLDER: 'Range',
    SEARCH_STARTS_WITH: 'Search starts with',
    SEARCH_STARTS_WITH_TOOLTIP: 'Determine if the searched element starts with the search term',
    SEARCH_CASE_SENSITIVE: 'Search is case sensitive',
    SEARCH_CASE_SENSITIVE_TOOLTIP: 'Determine if the search is case sensitive',
    SEARCH_FROM: 'From',
    SEARCH_TO: 'To',
    SEARCH_RANGE_LOWER: 'Lower bound of search range',
    SEARCH_RANGE_UPPER: 'Upper bound of search range',
    SEARCH_RANGE: 'Search Range'
  };

  private terms = this.standardTerms;

  @Input()
  public get searchTerms(): SearchTerms { return this.terms; }
  public set searchTerms(searchTerms: SearchTerms) {
    this.terms = { ...this.standardTerms, ...searchTerms };
  }

  /**
   * Determines whether search component is disabled
   */
  private disabled = false;

  @Input()
  public get searchDisabled(): boolean { return this.disabled; }
  public set searchDisabled(disabled: boolean) {
    this.disabled = disabled;
    enableControls(this.searchForm, !this.disabled);
  }

  /**
   * Determine if search looks for first match and then each click of the button looks for next match,
   * or whether all occurrences are searched for in each search request (=true)
   */
  @Input() public searchMultiple = false;

  /**
   * When searching from next match, skip other matched entries in cells on same row
   */
  @Input() public searchNextRow = true;

  /**
   * When doing continuous searches, the debounce time in milliseconds to be applied to key stokes
   */
  @Input() public searchDebounceMS = 200;

  /**
   * Width of component, pixels
   */
  @Input() public searchComponentWidth = 240;

  /**
   * Determine is the search comparison are case sensitive by default
   */
  @Input() public searchCaseSensitive = false;

  /**
   * Determine if search string is to be idendified only at the start of the searched value,
   * otherwise it can occur anywhere in the value
   */
  @Input() public searchStartsWith = false;

  /**
   * Strip these characters (or strings) from the search value before evaluating
   */
  @Input() public searchExcludeChars: string[] = [];

  /**
   * Determine if options for extended search are available i.e.
   * startWith, caseSensitive and range
   */
  @Input() public searchExtended = true;

  /**
   * Panel to enter extended search params open on hovering over
   * extended (+) button.  This determines how long the dealy is in milliseconds
   * before the panel appears
   */
  @Input() public searchExtendedPopupDelay = 200;

  /**
   * Range rather than a single search value
   */
  private searchRange = false;

  private searchFrom = '';

  private searchTo = '';

  /**
   * Output result of search
   */
  @Output() public searchResults: EventEmitter<SearchResult[]> = new EventEmitter();

  /**
   * Form containing search input field
   */
  public searchForm: FormGroup = new FormGroup({});

  /**
   * Track changes to search string being entered
   */
  private searchTextChanged$: Subscription | undefined;

  /**
   * Track last search match
   */
  private lastFoundResult: SearchResult | undefined;

  /**
   * Form containing extended search options
   */
  public extendedSearchForm: FormGroup = new FormGroup({});

  /**
   * Track changes to extended search options (popup)
   */
  private extendedSearchChanged$: Subscription | undefined;

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer) {
    this.loadImage('search', searchImage);
    this.loadImage('plus', plusImage);
  }

  ngOnInit(): void {
    // define for for search field
    const searchField = new FormControl('', [Validators.maxLength(200)]);

    // extended fields
    const startsWith = new FormControl(this.searchStartsWith);
    const caseSensitive = new FormControl(this.searchCaseSensitive);
    const searchFrom = new FormControl(this.searchFrom);
    const searchTo = new FormControl(this.searchTo);

    // form for search field
    this.searchForm.addControl('search', searchField);

    // respond to changes in the search field
    this.searchTextChanged$ = searchField.valueChanges
      .pipe(
        debounceTime(this.searchDebounceMS),
        distinctUntilChanged())
      .subscribe(search => {

        this.lastFoundResult = undefined;
        if (!search.trim() && !this.searchRange) {
          this.searchResults.emit([]);
          return;
        }

        // switch off the range search
        this.searchRange = false;
        this.searchFrom = '';
        this.searchTo = '';
        searchFrom.setValue('');
        searchTo.setValue('');

        // do continuous search if specified
        this.continuousSearch(search);
      });

    // define form for extended search options
    this.extendedSearchForm.addControl('startsWith', startsWith);
    this.extendedSearchForm.addControl('caseSensitive', caseSensitive);
    this.extendedSearchForm.addControl('searchFrom', searchFrom);
    this.extendedSearchForm.addControl('searchTo', searchTo);

    // set initial states - disable fromto if startWithis on
    if (this.searchStartsWith) {
      enableControls(searchFrom, false);
      enableControls(searchTo, false);
    }

    // listen for changes and update variables
    this.extendedSearchChanged$ = this.extendedSearchForm.valueChanges
      .subscribe((changes: ExtendedSearchChanges) => {
        // update fields
        this.searchStartsWith = changes.startsWith ?? false;
        this.searchCaseSensitive = changes.caseSensitive ?? false;
        this.searchFrom = changes.searchFrom ?? '';
        this.searchTo = changes.searchTo ?? '';

        // clear and disable from-to if startwith is on
        enableControls(searchFrom, !this.searchStartsWith);
        enableControls(searchTo, !this.searchStartsWith);

        // if startwith then clear out from-to
        if (this.searchStartsWith) {
          searchFrom.setValue('', { emitEvent: false });
          searchTo.setValue('', { emitEvent: false });
          this.searchRange = false;
        }

        // determine if a range
        if (!this.searchStartsWith && this.searchFrom.trim().length && this.searchTo.trim().length) {
          this.searchRange = true;
          searchField.setValue('', { emitEvent: false });
        } else { this.searchRange = false; }
      });
  }

  /**
   * Loads an SVG image to the MatIconRegistry from a string literal,
   * representing an svg
   */
  private loadImage(
    iconName: string,
    svg: string
  ): void {
    this.iconRegistry.addSvgIconLiteral(
      iconName,
      this.sanitizer.bypassSecurityTrustHtml(svg)
    );
  }

  /**
   * When the extended search option box closes perform a search
   */
  public extendedSearchClose(): void {
    const searchString = this.searchForm.get('search')?.value ?? '';
    this.search(searchString);
  }

  /**
   * Respond to each keystoke in the seach box
   */
  private continuousSearch(search: string): void {
    if (!this.searchContinuous) { return; }
    this.search(search);
  }

  /**
   * Performs a search
   */
  public search(search: string): void {
    if (!search.trim() && !this.searchRange) {
      this.searchResults.emit([]);
      return;
    }

    // if last found then split array in two and reassemble, so we search from next element
    let unfiltered: SearchResult[] = [...this.allResults];
    if (this.lastFoundResult && !this.searchMultiple && unfiltered.length > 0) {
      const foundRowIndex = this.lastFoundResult?.rowIndex ?? -1;
      const foundColumnIndex = this.lastFoundResult?.columnIndex ?? -1;
      const arrayIndex = this.searchNextRow ?
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
    if (this.searchMultiple) {
      this.lastFoundResult = undefined;
      filtered = unfiltered.filter(result => this.filter(result, search));
    } else {
      this.lastFoundResult = unfiltered.find(result => this.filter(result, search));
      filtered = this.lastFoundResult ? [this.lastFoundResult] : [];
    }

    // emit results
    this.searchResults.emit(filtered);
  }

  private filter(result: SearchResult, search: string): boolean {
    // extract numeric
    const nvalue = isNumber(result.value) ? result.value as number : undefined;
    let svalue = isNumber(result.value) ? (result.value as number).toString() : result.value as string;
    if (!svalue) { return false; }
    svalue = !this.searchCaseSensitive ? svalue.toLowerCase() : svalue;
    const sfrom = !this.searchCaseSensitive ? this.searchFrom.toLowerCase() : this.searchFrom;
    const sto = !this.searchCaseSensitive ? this.searchTo.toLowerCase() : this.searchTo;

    // transform case of search string if can insensitive
    const ssearch = !this.searchCaseSensitive ? search.toLowerCase() : search;

    // get numeric value of search
    const nsearch = isNumeric(ssearch) ? Number(ssearch) : undefined;

    // numeric range
    if (this.searchRange && isNumeric(this.searchFrom) && isNumeric(this.searchTo) && nvalue) {
      return this.numericRange(nvalue, Number(this.searchFrom), Number(this.searchTo));
    }

    // numeric equals
    if (!this.searchRange && nvalue && nsearch) { return this.numericEquals(nvalue, nsearch); }

    // string range
    if (this.searchRange) { return this.stringRange(svalue, sfrom, sto); }

    // string starts with
    if (!this.searchRange && this.searchStartsWith) { return this.stringStartsWith(svalue, ssearch); }

    // string contains
    if (!this.searchRange && !this.searchStartsWith) { return this.stringContains(svalue, ssearch); }

    return false;
  }

  private numericRange(cellvalue: number, lower: number, upper: number): boolean {
    return cellvalue >= lower && cellvalue <= upper;
  }

  private numericEquals(cellvalue: number, search: number): boolean { return cellvalue === search; }

  private stringRange(cellvalue: string, lower: string, upper: string): boolean {
    const scellvalue = strip(cellvalue, this.searchExcludeChars);
    return (scellvalue.localeCompare(lower) >= 0) &&
      (scellvalue.localeCompare(upper) <= 0);
  }

  private stringStartsWith(cellvalue: string, search: string): boolean {
    return strip(cellvalue, this.searchExcludeChars).startsWith(search);
  }

  private stringContains(cellvalue: string, search: string): boolean {
    return strip(cellvalue, this.searchExcludeChars).includes(search);
  }

  private searchCellValue(rowIndex: number, columnIndex: number): string | number | undefined {
    if (rowIndex < 0 || rowIndex >= this.searchData.length) { return undefined; }
    const cells = this.searchData[rowIndex];
    if (columnIndex < 0 || columnIndex >= cells.length) { return undefined; }
    return cells[columnIndex];
  }

  /**
   * Prevents button from taking focus on mouse down
   */
  public mouseDown(e: MouseEvent): void {
    e.preventDefault();
  }

  public get placeholder(): keyof SearchTerms {
    return this.searchRange ? 'SEARCH_RANGE_PLACEHOLDER' : 'SEARCH_PLACEHOLDER';
  }



  public clearSearchField(): void {
    this.searchForm.get('search')?.setValue('', { emitEvent: false });
  }

  public ngOnDestroy(): void {
    this.searchTextChanged$?.unsubscribe();
    this.extendedSearchChanged$?.unsubscribe();
  }
}



