import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
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
import { NgxMatSearchboxComponent } from './searchbox.component';
import { NgxMatSearchboxTermsPipe } from './searchbox-terms.pipe';

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
  ]
})
export class NgxMatSearchboxModule { }
