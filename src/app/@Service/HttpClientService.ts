import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {

  constructor(private httpClient: HttpClient) { }

  // url 是 api 的網址
  // postData 是呼叫 Api 時，要傳給 Api 的內容
  // 只有 post、put 可以傳資料給 Api

  // 取得
  getApi(url: string) {
    return this.httpClient.get(url)
  }

  // 新增
  postApi(url: string, postData: any) {
    return this.httpClient.post(url, postData)
  }

  // 更新
  putApi(url: string, putData: any) {
    return this.httpClient.put(url, putData)
  }

  // 刪除
  delApi(url: string, delData: any) {
    return this.httpClient.delete(url, delData)
  }
}
