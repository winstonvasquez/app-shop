import { Component } from '@angular/core';
import { HeaderBarHelpComponent } from './components/header-bar-help/header-bar-help.component';
import { HeaderMenuSearchComponent } from './components/header-menu-search/header-menu-search.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [HeaderBarHelpComponent, HeaderMenuSearchComponent],
  templateUrl: './header.component.html',
  host: { class: 'block w-full' }
})
export class HeaderComponent {
  // Container component, logic moved to children
}
