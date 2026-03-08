import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MetricCard {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  iconPath: string;
  iconColor: 'red' | 'orange' | 'amber' | 'gray';
}

interface Order {
  id: string;
  customer: string;
  product: string;
  date: string;
  total: string;
  status: 'success' | 'pending' | 'cancelled';
  statusLabel: string;
}

interface Product {
  name: string;
  category: string;
  sales: string;
}

const ICONS: Record<string, string> = {
  'dollar': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'cart': 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  'box': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  'arrow-up': 'M5 10l7-7m0 0l7 7m-7-7v18'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly arrowUpIcon = ICONS['arrow-up'];

  metrics = signal<MetricCard[]>([
    {
      label: 'Ventas Totales',
      value: 'S/ 45,230',
      change: '+12.5% vs mes anterior',
      isPositive: true,
      iconPath: ICONS['dollar'],
      iconColor: 'red'
    },
    {
      label: 'Pedidos',
      value: '1,234',
      change: '+8.2% vs mes anterior',
      isPositive: true,
      iconPath: ICONS['cart'],
      iconColor: 'orange'
    },
    {
      label: 'Productos',
      value: '567',
      change: '+15 nuevos productos',
      isPositive: true,
      iconPath: ICONS['box'],
      iconColor: 'amber'
    },
    {
      label: 'Clientes',
      value: '890',
      change: '+23 nuevos clientes',
      isPositive: true,
      iconPath: ICONS['users'],
      iconColor: 'gray'
    }
  ]);

  recentOrders = signal<Order[]>([
    {
      id: '#ORD-1234',
      customer: 'Juan Pérez',
      product: 'Smartphone XYZ',
      date: '12 Feb 2026',
      total: '$899.00',
      status: 'success',
      statusLabel: 'Completado'
    },
    {
      id: '#ORD-1233',
      customer: 'María García',
      product: 'Laptop Pro 15"',
      date: '12 Feb 2026',
      total: '$1,299.00',
      status: 'pending',
      statusLabel: 'Procesando'
    },
    {
      id: '#ORD-1232',
      customer: 'Carlos López',
      product: 'Auriculares BT',
      date: '11 Feb 2026',
      total: '$199.00',
      status: 'success',
      statusLabel: 'Completado'
    },
    {
      id: '#ORD-1231',
      customer: 'Ana Martínez',
      product: 'Smartwatch Pro',
      date: '11 Feb 2026',
      total: '$349.00',
      status: 'cancelled',
      statusLabel: 'Cancelado'
    },
    {
      id: '#ORD-1230',
      customer: 'Pedro Sánchez',
      product: 'Tablet 10"',
      date: '10 Feb 2026',
      total: '$499.00',
      status: 'success',
      statusLabel: 'Completado'
    }
  ]);

  topProducts = signal<Product[]>([
    { name: 'Smartphone XYZ', category: 'Electrónica', sales: '$12,450' },
    { name: 'Laptop Pro 15"', category: 'Computadoras', sales: '$9,800' },
    { name: 'Auriculares BT', category: 'Audio', sales: '$7,230' },
    { name: 'Smartwatch Pro', category: 'Wearables', sales: '$5,670' }
  ]);
}
