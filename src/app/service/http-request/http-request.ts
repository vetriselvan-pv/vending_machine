import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { CapacitorHttp, HttpOptions } from '@capacitor/core'

@Injectable({
  providedIn: 'root'
})
export class HttpRequest {

  private httpClient = inject(HttpClient);

  postRequest(url:string,body:any):Observable<any>{
    let httpHeaders :  HttpHeaders | Record<string, string | string[]> = new HttpHeaders()
    return this.httpClient.post<any>(url,body,)
  }

  httpPostRequest(url:string, payload : any): Observable<any>{
    let options : HttpOptions = {
      url : url,
      data : payload,
      responseType : 'json',
      headers : {
        'Content-Type': 'application/json'
      }
    };
    return from(CapacitorHttp.post(options))
  }

}
