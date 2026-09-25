import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';

const AUTOPLAY_INTERVAL_MS = 4000;
const SPACE_AUTOPLAY_INTERVAL_MS = 3200;
const STUDIO_COORDS: L.LatLngTuple = [10.4804714, -66.8623474];

interface NexusSpace {
  number: string;
  title: string;
  description: string;
  photo: string;
}

@Component({
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements AfterViewInit {
  protected readonly studioImages = [
    '/img/IMG_6259.jpg',
    '/img/IMG_6282.jpg',
    '/img/IMG_6291.jpg',
    '/img/IMG_6305.jpg',
    '/img/IMG_6314.jpg',
    '/img/IMG_6327.jpg',
  ];
  protected readonly activeSlide = signal(0);

  protected readonly nexusSpaces: NexusSpace[] = [
    { number: '01', title: 'Area de Musculacion', description: 'Maquinaria Panatta Sport de palanca y placas, mancuernas de alto pesaje y bancos regulables.', photo: '/img/IMG_6385.jpg' },
    { number: '02', title: 'Salon de Pilates', description: 'Unidades completas de Pilates Reformer en madera, torres de extension y barras espaldar.', photo: '/img/IMG_6305.jpg' },
    { number: '03', title: 'Salon de Ciclismo', description: 'Iluminacion neon dinamica y bicicletas Spinner / Fusion Drive de ultima generacion.', photo: '/img/IMG_6379.jpg' },
    { number: '04', title: 'Area Multifuncional', description: 'HIIT y Cross con SkiErg y RowErg Concept2, AirBikes Rogue y muro de escalada en bloque.', photo: '/img/IMG_6382.jpg' },
  ];
  protected readonly activeSpace = signal(0);
  private spaceAutoplayTimer?: ReturnType<typeof setInterval>;

  private readonly mapContainer = viewChild<ElementRef<HTMLElement>>('mapContainer');
  private readonly destroyRef = inject(DestroyRef);
  private autoplayTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.startAutoplay();
    this.startSpaceAutoplay();
    this.destroyRef.onDestroy(() => {
      clearInterval(this.autoplayTimer);
      clearInterval(this.spaceAutoplayTimer);
    });
  }

  ngAfterViewInit(): void {
    const container = this.mapContainer()?.nativeElement;
    if (!container) return;

    const map = L.map(container, {
      center: STUDIO_COORDS,
      zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      className: 'map-tiles-dark',
    }).addTo(map);

    const brandMarker = L.divIcon({
      className: 'map-marker',
      html: '<span></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    L.marker(STUDIO_COORDS, { icon: brandMarker }).addTo(map);

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);
    this.destroyRef.onDestroy(() => resizeObserver.disconnect());

    setTimeout(() => map.invalidateSize(), 0);
  }

  protected nextSlide(): void {
    this.activeSlide.update((slide) => (slide + 1) % this.studioImages.length);
    this.startAutoplay();
  }

  protected previousSlide(): void {
    this.activeSlide.update((slide) => (slide - 1 + this.studioImages.length) % this.studioImages.length);
    this.startAutoplay();
  }

  private startAutoplay(): void {
    clearInterval(this.autoplayTimer);
    this.autoplayTimer = setInterval(() => {
      this.activeSlide.update((slide) => (slide + 1) % this.studioImages.length);
    }, AUTOPLAY_INTERVAL_MS);
  }

  protected setActiveSpace(index: number): void {
    this.activeSpace.set(index);
    clearInterval(this.spaceAutoplayTimer);
  }

  protected resumeSpaceAutoplay(): void {
    this.startSpaceAutoplay();
  }

  private startSpaceAutoplay(): void {
    clearInterval(this.spaceAutoplayTimer);
    this.spaceAutoplayTimer = setInterval(() => {
      this.activeSpace.update((index) => (index + 1) % this.nexusSpaces.length);
    }, SPACE_AUTOPLAY_INTERVAL_MS);
  }
}
