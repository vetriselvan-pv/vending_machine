import {  TitleCasePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  IonContent,
  IonCard,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonImg,
  IonItem,
  IonButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [
    IonContent, 
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    TitleCasePipe,
    IonButton,
  ],
})
export class ProfileComponent implements OnInit {
  userDetail = [
    {
      id: 'User Name',
      value: 'Vetri',
    },
    {
      id: 'Email',
      value: 'vetri@gmail.com',
    },
    {
      id: 'Phone',
      value: '9876543210',
    },
    {
      id: 'Address',
      value: '123, Main Street, Anytown, USA',
    }, 
    {
      id: 'Blood Group',
      value: 'A+',
    }
  ]

  constructor() {}

  ngOnInit() {}
}
