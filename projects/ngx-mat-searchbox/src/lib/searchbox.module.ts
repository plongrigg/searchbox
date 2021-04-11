import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Provider } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MdePopoverModule } from '@material-extended/mde';
import { NgxMatSearchboxTermsPipe } from './searchbox-terms.pipe';
import { NgxMatSearchboxComponent } from './searchbox.component';
import { SearchboxDefaultService, SearchboxService } from './searchbox.service';

/**
 * Configure a custom service
 */
export type SearchboxConfig = {
  searchService?: Provider  // e.g. { provide: SearchboxService, useClass: SearchboxCustomService }
};

@NgModule({
  declarations: [
    NgxMatSearchboxComponent,
    NgxMatSearchboxTermsPipe
  ],
  imports: [
    CommonModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    MdePopoverModule,
    MatCheckboxModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
  ],
  exports: [
    NgxMatSearchboxComponent
  ],
})
export class NgxMatSearchboxModule {
  /**
   * Note that the forRoot() and forChild() methods are functionally the same, both provided
   * by convention
   */
  static forRoot(config: SearchboxConfig = {}): ModuleWithProviders<NgxMatSearchboxModule> {
    return {
      ngModule: NgxMatSearchboxModule,
      providers: [config.searchService || { provide: SearchboxService, useClass: SearchboxDefaultService }]
    };
  }

  static forChild(config: SearchboxConfig = {}): ModuleWithProviders<NgxMatSearchboxModule> {
    return {
      ngModule: NgxMatSearchboxModule,
      providers: [config.searchService || { provide: SearchboxService, useClass: SearchboxDefaultService }]
    };
  }
}
