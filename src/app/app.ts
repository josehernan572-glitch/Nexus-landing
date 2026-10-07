import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';

const AUTOPLAY_INTERVAL_MS = 4000;
const SPACE_AUTOPLAY_INTERVAL_MS = 3200;
const TRAINER_AUTOPLAY_INTERVAL_MS = 5000;
const TRAINER_SWIPE_THRESHOLD_PX = 40;
const INTRO_DURATION_MS = 2500;
const NAV_HIDE_OFFSET_PX = 120;

// [selector, reveal style, stagger between siblings]
const REVEAL_GROUPS: [string, 'up' | 'left' | 'right' | 'zoom', boolean][] = [
  ['.section-kicker, .eyebrow:not(.hero .eyebrow)', 'left', false],
  ['h2:not(.trainer-info h2)', 'up', false],
  ['.intro-body > p, .arrow-link, .classes-heading p, .app-copy, .location-copy > p, .contact-row', 'up', false],
  ['.studio-carousel', 'left', false],
  ['.stat', 'up', true],
  ['.spaces-expand', 'zoom', false],
  ['.amenity:not(.trainer-tags .amenity)', 'up', true],
  ['.brand-strip-label, .brand-strip-logo', 'up', true],
  ['.spaces-features article', 'up', true],
  ['.trainers-stage', 'up', false],
  ['.store-links, .location-copy .button', 'up', false],
  ['.app-preview', 'zoom', false],
  ['.app-features li', 'right', true],
  ['.map-embed', 'right', false],
];
const STUDIO_COORDS: L.LatLngTuple = [10.4804714, -66.8623474];

interface NexusSpace {
  number: string;
  title: string;
  description: string;
  photo: string;
}

interface Trainer {
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  photo: string;
}

@Component({
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: { '(window:scroll)': 'onWindowScroll()' },
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
    { number: '01', title: 'Área de Musculación', description: 'Maquinaria Panatta Sport de palanca y placas, mancuernas de alto pesaje y bancos regulables.', photo: '/img/IMG_6385.jpg' },
    { number: '02', title: 'Salón de Pilates', description: 'Unidades completas de Pilates Reformer en madera, torres de extensión y barras espaldar.', photo: '/img/IMG_6305.jpg' },
    { number: '03', title: 'Salón de Ciclismo', description: 'Iluminación neón dinámica y bicicletas Spinner / Fusion Drive de última generación.', photo: '/img/IMG_6379.jpg' },
    { number: '04', title: 'Área Multifuncional', description: 'HIIT y Cross con SkiErg y RowErg Concept2, AirBikes Rogue y muro de escalada en bloque.', photo: '/img/IMG_6382.jpg' },
  ];
  protected readonly activeSpace = signal(0);
  private spaceAutoplayTimer?: ReturnType<typeof setInterval>;

  protected readonly trainers: Trainer[] = [
    { name: 'Carlos Mendoza', role: 'Head Coach · Fuerza', bio: 'Diseña programas de fuerza e hipertrofia adaptados a tu nivel, con técnica impecable y progresión medible.', specialties: ['Hipertrofia', 'Powerlifting', 'Recomposición corporal'], photo: '/img/pngwing.com (3).png' },
    { name: 'Valeria Rojas', role: 'Coach de Pilates', bio: 'Especialista en Pilates Reformer y movilidad. Trabaja control, postura y core para que te muevas mejor.', specialties: ['Pilates Reformer', 'Movilidad', 'Postura'], photo: '/img/pngwing.com (6).png' },
    { name: 'Andrés Salazar', role: 'Coach Funcional / HIIT', bio: 'Sesiones intensas de acondicionamiento con Concept2 y AirBikes para llevar tu resistencia al siguiente nivel.', specialties: ['HIIT', 'Cross Training', 'Acondicionamiento'], photo: '/img/pngwing.com (4).png' },
    { name: 'Daniela Pérez', role: 'Coach de Ciclismo Indoor', bio: 'Clases de ciclismo con música y energía de principio a fin, enfocadas en cardio y quema calórica.', specialties: ['Ciclismo Indoor', 'Cardio', 'Pérdida de grasa'], photo: '/img/pngwing.com (2).png' },
  ];
  protected readonly activeTrainer = signal(0);
  private trainerAutoplayTimer?: ReturnType<typeof setInterval>;
  private trainerTouchStartX = 0;

  protected readonly showIntro = signal(true);
  protected readonly navHidden = signal(false);
  protected readonly navScrolled = signal(false);
  protected readonly menuOpen = signal(false);
  private lastScrollY = 0;

  private readonly mapContainer = viewChild<ElementRef<HTMLElement>>('mapContainer');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private autoplayTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.startAutoplay();
    this.startSpaceAutoplay();
    this.startTrainerAutoplay();
    this.destroyRef.onDestroy(() => {
      clearInterval(this.autoplayTimer);
      clearInterval(this.spaceAutoplayTimer);
      clearInterval(this.trainerAutoplayTimer);
    });
  }

  ngAfterViewInit(): void {
    const introTimer = setTimeout(() => this.showIntro.set(false), INTRO_DURATION_MS);
    this.destroyRef.onDestroy(() => clearTimeout(introTimer));
    this.setupScrollReveal();

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

  protected onWindowScroll(): void {
    const y = window.scrollY;
    this.navScrolled.set(y > 40);
    this.navHidden.set(y > this.lastScrollY && y > NAV_HIDE_OFFSET_PX);
    if (Math.abs(y - this.lastScrollY) > 4) this.menuOpen.set(false);
    this.lastScrollY = y;
  }

  private setupScrollReveal(): void {
    const root = this.host.nativeElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    for (const [selector, style, stagger] of REVEAL_GROUPS) {
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (el.classList.contains('reveal')) return;
        el.classList.add('reveal', `reveal-${style}`);
        if (stagger && el.parentElement) {
          const siblings = Array.from(el.parentElement.children).filter((c) => c.matches(selector));
          el.style.setProperty('--reveal-delay', `${siblings.indexOf(el) * 90}ms`);
        }
        observer.observe(el);
      });
    }
    this.destroyRef.onDestroy(() => observer.disconnect());
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

  protected setActiveTrainer(index: number): void {
    this.activeTrainer.set((index + this.trainers.length) % this.trainers.length);
    this.startTrainerAutoplay();
  }

  protected onTrainerTouchStart(event: TouchEvent): void {
    this.trainerTouchStartX = event.changedTouches[0].clientX;
  }

  protected onTrainerTouchEnd(event: TouchEvent): void {
    const deltaX = event.changedTouches[0].clientX - this.trainerTouchStartX;
    if (Math.abs(deltaX) < TRAINER_SWIPE_THRESHOLD_PX) return;
    this.setActiveTrainer(this.activeTrainer() + (deltaX < 0 ? 1 : -1));
  }

  private startTrainerAutoplay(): void {
    clearInterval(this.trainerAutoplayTimer);
    this.trainerAutoplayTimer = setInterval(() => {
      this.activeTrainer.update((index) => (index + 1) % this.trainers.length);
    }, TRAINER_AUTOPLAY_INTERVAL_MS);
  }
}
