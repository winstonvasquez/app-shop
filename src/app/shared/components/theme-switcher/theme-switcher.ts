import { Component, inject, signal } from '@angular/core';
import { ThemeService, AppTheme } from '../../../core/services/theme/theme';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [],
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.scss',
})
export class ThemeSwitcherComponent {
  public themeService = inject(ThemeService);

  // State for the sliding panel
  public isPanelOpen = signal<boolean>(false);

  // Available themes for the UI
  public themes: { id: AppTheme; name: string; color: string; bgColor: string }[] = [
    { id: 'obsidian',     name: 'Obsidian ⭐',   color: '#E8152D', bgColor: '#0E1520' },
    { id: 'dark',         name: 'Dark',         color: '#ef4444', bgColor: '#171717' },
    { id: 'orange-black', name: 'Orange Black',  color: '#ff7e0d', bgColor: '#1d1a19' },
    { id: 'orange-light', name: 'Orange Light',  color: '#f36203', bgColor: '#fff8ec' },
    { id: 'verano',       name: 'Verano 🏖️',    color: '#c75535', bgColor: '#fff7ed' },
    { id: 'invierno',     name: 'Invierno ❄️',  color: '#4a90d9', bgColor: '#0c1929' },
    { id: 'primavera',    name: 'Primavera 🌸',  color: '#2c7e4a', bgColor: '#f2fbf4' },
    { id: 'otoño',        name: 'Otoño 🍂',      color: '#a87020', bgColor: '#faf4e8' },
  ];

  public togglePanel(): void {
    this.isPanelOpen.update(v => !v);
  }

  public closePanel(): void {
    this.isPanelOpen.set(false);
  }

  public selectTheme(themeId: AppTheme): void {
    this.themeService.setTheme(themeId);
  }
}
