import { Component, input, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonInput, IonLabel, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-text-box',
  templateUrl: './text-box.component.html',
  styleUrls: ['./text-box.component.scss'],
  imports  : [IonInput, IonLabel,  FormsModule, ReactiveFormsModule]
})
export class TextBoxComponent  implements OnInit {

    placeholder = input.required();
  label = input.required();

  constructor() { }

  ngOnInit() {}

}
