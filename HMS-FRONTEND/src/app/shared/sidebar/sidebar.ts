import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink ,RouterLinkActive} from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, CommonModule,RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',

})
export class Sidebar implements OnInit {

  nodes = signal<any[]>([]);

  readonly http = inject(HttpClient);

  constructor() {}

  ngOnInit(): void {

    this.http.get("http://localhost:5000/api/node/list").subscribe((Response: any) => {
      this.nodes.set(Response.data || []);
      console.log("nodes:", this.nodes());
    });

  }

   getFullPath(path: string): string {
    const basePath = localStorage.getItem('basePath') || '';
    return `${basePath}${path}`;
  }
}
