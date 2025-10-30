import { Component, ElementRef, HostListener, input, model, OnInit, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonSearchbar,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchCircle } from 'ionicons/icons';

@Component({
  selector: 'app-searchable-dropdown',
  templateUrl: './searchable-dropdown.component.html',
  styleUrls: ['./searchable-dropdown.component.scss'],
  imports: [
    IonItem,
    IonLabel,
    IonList,
    IonInput,
    FormsModule
  ],
  providers: [],
})
export class SearchableDropdownComponent implements OnInit {
  placeholder = input.required();
  items = input.required<Array<any>>();
  itemTextField = input.required<string>();
  itemIdField = input.required<string>();
  selectionChange = output<any>();
  label = input.required();
    // @ViewChild('dropdownContainer') dropdownContainer: ElementRef;

    dropdownContainer = viewChild<ElementRef>('dropdownContainer')

  isOpen = signal<boolean>(false);

  filteredItems = signal<any[]>([]);
  selectedValue: any;
  selectedText = model<string>('');

  constructor() {
    addIcons({
      searchCircle,
    });
  }

  ngOnInit() {
    this.filteredItems.set([...this.items()]);
  }

  filterItems(event: any) {
    const searchTerm = (event.target.value || '').toLowerCase();
    this.filteredItems.set(
      this.items().filter((item) =>
        item[this.itemTextField()].toLowerCase().includes(searchTerm)
      )
    );
  }

  onSelect(item:any){
    this.selectedValue = item[this.itemIdField()];
    this.selectedText.set(item[this.itemTextField()]);
    this.cancel()
  }

  cancel() {
    this.isOpen.set(false);
  }

  show() {
    this.isOpen.set(true);
  }

    @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.dropdownContainer() && !this.dropdownContainer()?.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
