import { Pipe, PipeTransform } from '@angular/core';
import { SearchTerms } from './searchbox.model';

/**
 * Looks for key in SearchTerms object and returns value or
 * if not found return the key
 */
@Pipe({
  name: 'localizeTerms'
})
export class NgxMatSearchboxTermsPipe implements PipeTransform {
  public transform(key: keyof SearchTerms, terms: SearchTerms): string {
    return terms[key] || key;
  }
}
