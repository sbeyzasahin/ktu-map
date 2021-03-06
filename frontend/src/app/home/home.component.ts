import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { View, Map, Feature } from 'ol';
import { Router, ActivatedRoute } from '@angular/router';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { Circle as CircleStyle, Text } from 'ol/style';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/operators';
import GeoJSON from 'ol/format/GeoJSON';
import Select, { SelectEvent } from 'ol/interaction/Select';
import { pointerMove } from 'ol/events/condition';
import { FeatureLike } from 'ol/Feature';
import TileImage from 'ol/source/TileImage';
interface Unit {
  id: number;
  name: string;
  category_id: number;
  geom;
  parent_unit_id: number;
  description: string;
  telephone: string;
  website: string;
}
export enum MapState {
  DRAW_STARTED = 'DRAW_STARTED',
  DEFAULT = 'DEFAULT',
  DRAW_ENDED = 'DRAW_ENDED',
  DRAW_EDIT = 'DRAW_EDIT',
  DRAW_EDIT_ENDED = 'DRAW_EDIT_ENDED',
  DELETE = 'DELETE'

}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  MapState = MapState;
  showFiller = false;
  filteredStates: Observable<Unit[]>;
  sidebarVisibility: boolean;
  @ViewChild('drawer', { static: false })
  drawer: MatSidenav;
  @ViewChild('sidenav', { static: true }) sidenav: MatSidenav;
  @ViewChild('map', { static: true }) mapRef: ElementRef<HTMLDivElement>;
  unitList: Array<Unit>;
  reason = '';
  coordinates = [];
  dataSource;
  unit_id: number;
  selectedUnit: Unit;
  map: Map;
  adminActive = false;
  vectorLayer: VectorLayer;
  stateCtrl = new FormControl();
  selectedFeature = null;
  unitName = null;
  selectPointerMove: Select;
  googleRoad: TileLayer;
  openStreetMap: TileLayer;
  isGoogleVisible: boolean;
  currentMapState: MapState = MapState.DEFAULT;
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private httpClient: HttpClient,
  ) {
    this.filteredStates = this.stateCtrl.valueChanges
      .pipe(
        map(unit => unit ? this._filterStates(unit) : this.unitList.slice())
      );
  }
  private _filterStates(value: string): Unit[] {
    const filterValue = value.toLowerCase();
    return this.unitList.filter(state => state.name.toLowerCase().indexOf(filterValue) === 0);
  }
  close(reason: string) {
    this.reason = reason;
    this.sidenav.close();
  }
  refreshBasemaps(isGoogleVisible: boolean) {
    this.googleRoad.setVisible(!isGoogleVisible);
    this.openStreetMap.setVisible(isGoogleVisible);
    this.isGoogleVisible = !isGoogleVisible;
  }
  ngOnInit() {
    this.googleRoad = new TileLayer({
      source: new TileImage({ url: 'https://mt{1-3}.google.com/vt/lyrs=s@13&hl=tr&&x={x}&y={y}&z={z}' }),
      visible: false,
    });
    this.openStreetMap = new TileLayer({
      source: new OSM(),
      visible: false
    });
    this.refreshBasemaps(true)
    this.sidebarVisibility = this.activatedRoute.snapshot.queryParams.sidebar === 'open';
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if (queryParams.sidebar) {
        this.sidebarVisibility = queryParams.sidebar === 'open';
        // this.sidebarVisibility ? this.drawer.open() : this.drawer.close();/
      }
      if (queryParams.basemap) {
        console.log('queryParams.basemap', queryParams.basemap);
        const state = queryParams.basemap === 'true';
        this.refreshBasemaps(state)
      }
    });
    this.initMap();
    this.getUnits();
    // this.drawer.openedChange.subscribe(() => {
    //   console.log('openedChange');
    //   this.map.updateSize();
    // })
  }

  changeSidebarVisibility() {
    const newState = this.sidebarVisibility ? 'close' : 'open';
    this.sidebarVisibility ? this.drawer.close() : this.drawer.open();
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { sidebar: newState },
      queryParamsHandling: 'merge'
    });
    this.updateSize();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }


  initMap() {

    const source = new VectorSource();
    this.vectorLayer = new VectorLayer({
      source,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
          color: 'grey',
          width: 5
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: 'grey'
          })
        })
      })
    });

    this.vectorLayer.setStyle((f: FeatureLike) => {
      // console.log("f", f);
      if (f.getId() > 10) {
        return new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          }),
          stroke: new Stroke({
            color: '#0c355b',
            width: 5
          }),
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({
              color: '#0c355b'
            })
          }),
          text: new Text({
            text: f.get('name'),
            font: '18px Arial',
            fill: new Fill({
              color: '#32587a'
            }),
            // overflow: true

          })
        })
      }
      return new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
          color: '#075CFF',
          width: 2
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: '#075CFF'
          })
        }),
        text: new Text({
          text: f.get('name') || '',
          font: '18px Arial',
          fill: new Fill({
            color: '#075CFF'
          })
        })
      })
      return undefined;

    })


    const map = new Map({
      // layers: [raster],
      layers: [this.openStreetMap, this.googleRoad, this.vectorLayer],
      target: this.mapRef.nativeElement,
      view: new View({
        zoom: 16,
        maxZoom: 21,
        center: [4426990, 5011900]
      }),
      controls: []
    });
    this.map = map;
    (window as any).map = map;
  }

  getUnits(shouldFit = true) {
    this.httpClient.get(environment.apiUrl + 'unit').subscribe((response: Array<Unit>) => {
      this.unitList = response;
      const geoJson = new GeoJSON();
      const features = response.map((data) => {
        const multiPolygon = geoJson.readGeometry(data.geom).transform('EPSG:4326', 'EPSG:3857')
        const f = new Feature(multiPolygon);
        f.setId(data.id);
        f.setProperties(data);
        return f;
      });
      this.vectorLayer.getSource().clear();
      this.vectorLayer.getSource().addFeatures(features);
      if (shouldFit) {
        const extend = this.vectorLayer.getSource().getExtent();
        this.map.getView().fit(extend);
      }
    })
  }

  getViewUnit(id: number) {
    this.httpClient.get(environment.apiUrl + 'unit/' + id).subscribe((response: Unit) => {

      this.selectedUnit = response;
      const feature = this.vectorLayer.getSource().getFeatureById(id)
      if (!feature) {
        return;
      }
      this.map.getView().fit(feature.getGeometry().getExtent(), {
        duration: 250,
        padding: [40, 40, 40, 40],
        maxZoom: 20,
      })
      this.updateSize();
    })
  }

  enterSearchGetUnit(event: KeyboardEvent, unitId: number) {
    console.log('keyup: ', event);
  }

  changeViewMapBase() {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        basemap: this.isGoogleVisible
      },
      queryParamsHandling: 'merge'
    });
    this.updateSize();
  }

  zoom(level: number) {
    const view = this.map.getView();
    view.setZoom(view.getZoom() + level);
  }


  updateSize() {
    setTimeout(() => {
      setTimeout(() => {
        this.map.updateSize();
      }, 300);
      this.map.updateSize();
    }, 300);
  }

  resetZoom() {
    const extend = this.vectorLayer.getSource().getExtent();
    this.map.getView().fit(extend, {
      padding: [60, 60, 60, 60]
    });
  }

  goToHome() {
    this.map.getView().setZoom(16);
    this.map.getView().setCenter([4426990, 5011900]);
  }
  featureHighlight(feature?: Feature) {
    if (feature) {
      this.unitName = feature.get('name');

    } else {
      this.unitName = null;
    }
  }
  updateUnitIdOnUrl = (id?: number) => {
    if (id === null) {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: {
          'unit_id': null,
        },
        queryParamsHandling: 'merge'
      });
      return;
    }
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        'unit_id': id,
      },
      queryParamsHandling: 'merge'
    });
  }
  featureSelect(feature?: Feature) {
    if (!feature) {
      this.drawer.close();
      this.updateSize();
      this.updateUnitIdOnUrl(null);
      return
    }
    this.drawer.open()
    if (this.selectedFeature === feature) {
      return;
    }
    this.selectedFeature = feature;
    const unitName = feature.get('name');
    this.unitName = unitName;
    const id = feature.get('id');
    this.updateUnitIdOnUrl(id);
    this.getViewUnit(id);
  }
}
