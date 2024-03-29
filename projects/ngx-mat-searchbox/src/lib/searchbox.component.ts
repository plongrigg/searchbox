import { ChangeDetectionStrategy, Component, EventEmitter, forwardRef, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { plusImage, searchImage } from './searchbox.images';
import { ExtendedSearchChanges, SearchData, SearchParams, SearchResult, SearchResults, SearchTerms } from './searchbox.model';
import { enableControls } from './searchbox.utils';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SearchboxService } from './searchbox.service';
import { MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';

/**
 * Searchbox component, sized to fit a toolbar, to which a set of search data is provided, and which can then
 * perform a search on the provided data and emit a result to a parent component.
 */
@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ngx-mat-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => NgxMatSearchboxComponent),
    },
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: { disableTooltipInteractivity: true }
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class NgxMatSearchboxComponent implements OnInit, OnDestroy, ControlValueAccessor {
  /**
   * Full search dataset, in format suitable for reporting search results
   */
  private allResults: SearchResult[] = [];

  /**
   * Supplies search dataset to component
   */
  @Input()
  public set searchData(data: SearchData) {

    // flatten [][] into SearchResult[]
    this.allResults = data
      .map((row, rowIndex) => row.map((cell, columnIndex) => ({ rowIndex, columnIndex, value: cell ?? '', searchRow: row }))).flat(1);

    // determine if the last found result is the same in the new data set
    // else if it has changed then initialize last found, so any new search start from beginning
    if (this.lastFoundResult) {
      const newCellValue = this.searchCellValue(data, this.lastFoundResult.rowIndex, this.lastFoundResult.columnIndex);
      if (!newCellValue || newCellValue !== this.lastFoundResult.value) { this.lastFoundResult = undefined; }
    }
  }

  /**
   * Determines if search happens on each key stroke or only when search button is clicked (or on enter key stoke)
   */
  @Input() public searchContinuous = true;

  /**
   * Localization
   */
  private terms = this.searchService.standardTerms();

  @Input()
  public get searchTerms(): SearchTerms { return this.terms; }
  public set searchTerms(searchTerms: SearchTerms) {
    this.terms = { ...this.searchService.standardTerms(), ...searchTerms };
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
   * When searching for next match, skip other matched entries in cells on same row
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
   * Determine if search string is to be identified only at the start of the searched value,
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
   * extended (+) button.  This determines how long the delay is in milliseconds
   * before the panel appears
   */
  @Input() public searchExtendedPopupDelay = 200;

  /**
   * Applies angular material apperance to the field
   */
  @Input() public searchFieldAppearance: 'outline' | 'standard' | 'fill' | 'legacy' = 'outline';

  /**
   * If 'small' then the field has a font of 9pt and the margins, padding etc. are reduced so that
   * the field can comfortably fit on a toolbar.
   */
  @Input() public searchFieldSize: 'small' | 'default' = 'small';

  /**
   * Range rather than a single search value
   */
  private searchRange = false;

  private searchFrom = '';

  private searchTo = '';

  /**
   * Output result of search
   */
  @Output() public searchResults: EventEmitter<SearchResults> = new EventEmitter();

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

  /**
   * Track if component has been touched, i.e if a search string has been entered
   */
  private touched = false;

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private searchService: SearchboxService) {
    this.loadImage('ngx-search', searchImage);
    this.loadImage('ngx-search-plus', plusImage);
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
    enableControls(this.searchForm, !this.disabled);

    // respond to changes in the search field
    this.searchTextChanged$ = searchField.valueChanges
      .pipe(
        debounceTime(this.searchDebounceMS),
        distinctUntilChanged())
      .subscribe(search => {

        this.lastFoundResult = undefined;
        if (!search.trim() && !this.searchRange) {
          const searchResults: SearchResults = [];
          searchResults.searchParams = this.searchParams(search);
          this.searchResults.emit(searchResults);
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

        // if startswith then clear out from-to
        if (this.searchStartsWith) {
          searchFrom.setValue('', { emitEvent: false });
          searchTo.setValue('', { emitEvent: false });
          this.searchRange = false;
        }

        // disable from-to if startswith is on, else enable
        enableControls(searchFrom, !this.searchStartsWith);
        enableControls(searchTo, !this.searchStartsWith);

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
   * Respond to each keystoke in the search box
   */
  private continuousSearch(search: string): void {
    if (!this.searchContinuous) { return; }
    this.search(search);
  }

  /**
   * Performs a search
   */
  public search(search: string): void {
    const searchResults: SearchResults =
      this.searchService.search(search, this.allResults, this.lastFoundResult, this.searchMultiple, this.searchNextRow,
        this.searchCaseSensitive, this.searchStartsWith, this.searchRange, this.searchFrom, this.searchTo, this.searchExcludeChars);

    // add search params to array
    searchResults.searchParams = this.searchParams(search);

    if (this.searchMultiple) {
      this.lastFoundResult = undefined;
    } else {
      this.lastFoundResult = searchResults[0];
    }
    this.searchResults.emit(searchResults);

    // ControlValueAccessor
    this.onChange(searchResults);
  }

  /**
   * Find cell value in search dataset based on row and column indexes
   */
  private searchCellValue(data: SearchData, rowIndex: number, columnIndex: number): string | number | undefined {
    if (rowIndex < 0 || rowIndex >= data.length) { return undefined; }
    const cells = data[rowIndex];
    if (columnIndex < 0 || columnIndex >= cells.length) { return undefined; }
    return cells[columnIndex];
  }

  /**
   * Create SearchParams object from search string and current parameter values (set by default or extended dialog)
   */
  private searchParams(search: string): SearchParams {
    return {
      search, searchMultiple: this.searchMultiple, searchNextRow: this.searchNextRow,
      searchCaseSensitive: this.searchCaseSensitive, searchStartsWith: this.searchStartsWith, searchRange: this.searchRange,
      searchFrom: this.searchFrom, searchTo: this.searchTo, searchExcludeChars: this.searchExcludeChars
    };
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

  /** ControlValueAccessor implementation */
  private onChange = (searchResults: SearchResults) => { };

  private onTouched = () => { };

  public writeValue(search: string | undefined): void {
    this.searchForm.get('search')?.setValue(search ?? '', { emitEvent: true });
  }

  public registerOnChange(fn: (searchResults: SearchResults) => void): void {
    this.onChange = (searchResults: SearchResults) => {
      fn(searchResults);
      this.markAsTouched();
    };
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(disabled: boolean): void {
    this.searchDisabled = disabled;
  }

  private markAsTouched(): void {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }

  public ngOnDestroy(): void {
    this.searchTextChanged$?.unsubscribe();
    this.extendedSearchChanged$?.unsubscribe();
  }
}



