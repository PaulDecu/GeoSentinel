// src/screens/RiskMapScreen.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS } from '../utils/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RiskWithDistance {
  id: string;
  title: string;
  category: string;
  categoryLabel?: string;
  categoryColor?: string;  // fourni directement par l'API
  categoryIcon?: string;   // fourni directement par l'API
  severity: string;
  latitude: number;
  longitude: number;
  distance: number;
  description?: string;
}

interface LocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

type RiskMapRouteParams = {
  RiskMap: {
    risks: RiskWithDistance[];
    userPosition: LocationPosition;
  };
};

// ─── Couleur/icône par catégorie — fallback si categoryColor absent ───────────

const getCategoryColor = (category: string, categoryColor?: string): string => {
  if (categoryColor) return categoryColor;   // ✅ priorité au champ API
  const colors: Record<string, string> = {
    naturel:       '#10B981',
    technologique: '#3B82F6',
    sanitaire:     '#EF4444',
    social:        '#8B5CF6',
    industriel:    '#F59E0B',
    environnemental: '#06B6D4',
  };
  return colors[category?.toLowerCase()] || '#6B7280';
};

const getCategoryIcon = (category: string, categoryIcon?: string): string => {
  if (categoryIcon) return categoryIcon;     // ✅ priorité au champ API
  const icons: Record<string, string> = {
    naturel:       '🌪️',
    technologique: '⚙️',
    sanitaire:     '🏥',
    social:        '👥',
    industriel:    '🏭',
    environnemental: '🌿',
  };
  return icons[category?.toLowerCase()] || '⚠️';
};

// ─── HTML Leaflet (injecté dans la WebView) ───────────────────────────────────
// Leaflet est chargé depuis cdnjs. Les tuiles OSM sont restreintes au bbox
// initial de 1 km autour de l'utilisateur grâce à maxBounds.

const buildLeafletHTML = (
  userLat: number,
  userLng: number,
  risks: RiskWithDistance[]
): string => {
  const risksJson = JSON.stringify(
    risks.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      severity: r.severity,
      lat: r.latitude,
      lng: r.longitude,
      distance: Math.round(r.distance),
      description: r.description || '',
      color: getCategoryColor(r.category, r.categoryColor),
      icon: getCategoryIcon(r.category, r.categoryIcon),
    }))
  );

  // bbox 1 km autour de l'utilisateur (~0.009° par km)
  const delta = 0.009;
  const bounds = [
    [userLat - delta, userLng - delta],
    [userLat + delta, userLng + delta],
  ];
  const boundsJson = JSON.stringify(bounds);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
  />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }

    /* ── Popup personnalisé ── */
    .risk-popup .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      border: none;
      padding: 0;
      overflow: hidden;
    }
    .risk-popup .leaflet-popup-content {
      margin: 0;
      width: 240px !important;
    }
    .popup-header {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
      font-size: 13px;
      color: #fff;
    }
    .popup-body {
      padding: 10px 14px;
      font-size: 12px;
      color: #374151;
      background: #fff;
    }
    .popup-body .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .popup-body .label { color: #6B7280; }
    .popup-body .val   { font-weight: bold; }
    .popup-desc {
      margin-top: 6px;
      font-style: italic;
      color: #9CA3AF;
      font-size: 11px;
      border-top: 1px solid #F3F4F6;
      padding-top: 6px;
    }

    /* ── Marqueur utilisateur (flèche boussole) ── */
    .user-arrow-container {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-arrow {
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-bottom: 36px solid #2563EB;
      filter: drop-shadow(0 2px 4px rgba(37,99,235,0.5));
      transition: transform 0.3s ease;
    }
    .user-dot {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #fff;
      border-radius: 50%;
      top: 26px;
      left: 19px;
    }

    /* ── Étiquette distance ── */
    .dist-label {
      background: rgba(0,0,0,0.6);
      color: #fff;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 8px;
      white-space: nowrap;
      margin-top: 2px;
      display: inline-block;
    }

    /* ── Légende ── */
    #legend {
      position: absolute;
      bottom: 24px;
      left: 10px;
      background: rgba(255,255,255,0.92);
      border-radius: 10px;
      padding: 8px 12px;
      z-index: 1000;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    #legend div { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .leg-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    #compass-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.92);
      border-radius: 10px;
      padding: 6px 10px;
      z-index: 1000;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 5px;
    }
  </style>
</head>
<body>
<div id="map"></div>

<!-- Légende -->
<div id="legend">
  <div><div class="leg-dot" style="background:#10B981"></div>Naturel</div>
  <div><div class="leg-dot" style="background:#F59E0B"></div>Technologique</div>
  <div><div class="leg-dot" style="background:#EF4444"></div>Sanitaire</div>
  <div><div class="leg-dot" style="background:#8B5CF6"></div>Social</div>
  <div><div class="leg-dot" style="background:#2563EB"></div>Vous</div>
</div>

<!-- Badge boussole -->
<div id="compass-badge">
  🧭 <span id="compass-text">Cap: --°</span>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
(function() {
  var USER_LAT = ${userLat};
  var USER_LNG = ${userLng};
  var RISKS    = ${risksJson};
  var BOUNDS   = ${boundsJson};

  // ── Carte ──────────────────────────────────────────────────────────────────
  var map = L.map('map', {
    center: [USER_LAT, USER_LNG],
    zoom: 16,
    zoomControl: true,
    maxBounds: BOUNDS,          // empêche le déplacement hors du 1 km
    maxBoundsViscosity: 1.0,    // rebond strict
    minZoom: 14,                // on ne peut pas trop dézoomer
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
    bounds: BOUNDS,             // ne charge que les tuiles dans le bbox
  }).addTo(map);

  // ── Cercle de rayon ────────────────────────────────────────────────────────
  L.circle([USER_LAT, USER_LNG], {
    radius: 500,
    color: '#2563EB',
    fillColor: '#93C5FD',
    fillOpacity: 0.08,
    weight: 1.5,
    dashArray: '6 4',
  }).addTo(map);

  // ── Marqueur utilisateur (flèche orientable) ───────────────────────────────
  var arrowHtml = '<div class="user-arrow-container">'
                + '<div class="user-arrow" id="arrow"></div>'
                + '<div class="user-dot"></div>'
                + '</div>';

  var userIcon = L.divIcon({
    html: arrowHtml,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    className: '',
  });

  var userMarker = L.marker([USER_LAT, USER_LNG], { icon: userIcon, zIndexOffset: 1000 })
    .addTo(map)
    .bindTooltip('📍 Vous êtes ici', { permanent: false, offset: [0, -10] });

  // ── Boussole / orientation ─────────────────────────────────────────────────
  var currentHeading = 0;

  function applyHeading(deg) {
    currentHeading = deg;
    var arrow = document.getElementById('arrow');
    if (arrow) {
      // La flèche pointe vers le haut par défaut (nord = 0°)
      arrow.style.transform = 'rotate(' + deg + 'deg)';
    }
    document.getElementById('compass-text').textContent = 'Cap: ' + Math.round(deg) + '°';
  }

  // DeviceOrientationEvent — fonctionne dans WebView Android/iOS
  if (typeof DeviceOrientationEvent !== 'undefined') {
    // iOS 13+ nécessite une permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(function(state) {
          if (state === 'granted') {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        })
        .catch(function() {});
    } else {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }

  // Message depuis React Native pour passer le heading (fallback natif)
  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'HEADING') {
        applyHeading(msg.value);
      }
    } catch (_) {}
  });

  document.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'HEADING') {
        applyHeading(msg.value);
      }
    } catch (_) {}
  });

  function handleOrientation(event) {
    var heading = null;
    if (event.webkitCompassHeading !== undefined) {
      // iOS : webkitCompassHeading donne déjà le cap magnétique en degrés
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android : alpha = rotation Z (0 = nord, sens antihoraire)
      // On inverse pour obtenir un cap horaire
      heading = (360 - event.alpha) % 360;
    }
    if (heading !== null) {
      applyHeading(heading);
    }
  }

  // ── Risques ────────────────────────────────────────────────────────────────
  RISKS.forEach(function(risk) {
    var circleMarker = L.circleMarker([risk.lat, risk.lng], {
      radius: 14,
      fillColor: risk.color,
      color: '#fff',
      weight: 2.5,
      fillOpacity: 0.9,
    }).addTo(map);

    // Étiquette emoji + distance
    var labelIcon = L.divIcon({
      html: '<div style="text-align:center; margin-top:-6px;">'
          + risk.icon
          + '<br><span class="dist-label">' + risk.distance + 'm</span>'
          + '</div>',
      iconSize: [50, 36],
      iconAnchor: [25, -10],
      className: '',
    });
    L.marker([risk.lat, risk.lng], { icon: labelIcon, interactive: false }).addTo(map);

    // Popup détail
    var severityLabel = { low: 'Faible', medium: 'Moyen', high: 'Élevé' }[risk.severity] || risk.severity;
    var popupContent = '<div>'
      + '<div class="popup-header" style="background:' + risk.color + ';">'
      + risk.icon + ' ' + risk.category.toUpperCase()
      + '</div>'
      + '<div class="popup-body">'
      + '<div class="row"><span class="label">Nom</span><span class="val" style="max-width:140px;text-align:right;font-size:11px;">' + risk.title + '</span></div>'
      + '<div class="row"><span class="label">Distance</span><span class="val" style="color:' + risk.color + ';">' + risk.distance + 'm</span></div>'
      + '<div class="row"><span class="label">Sévérité</span><span class="val">' + severityLabel + '</span></div>'
      + (risk.description ? '<div class="popup-desc">' + risk.description + '</div>' : '')
      + '</div></div>';

    circleMarker.bindPopup(popupContent, {
      className: 'risk-popup',
      maxWidth: 260,
    });

    circleMarker.on('click', function() {
      map.setView([risk.lat, risk.lng], Math.max(map.getZoom(), 17));
    });
  });

})();
</script>
</body>
</html>`;
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function RiskMapScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RiskMapRouteParams, 'RiskMap'>>();
  const webViewRef = useRef<WebView>(null);

  const { risks, userPosition } = route.params;

  // Envoi du heading natif vers la WebView si DeviceOrientation JS ne suffit pas
  // (Android Doze / restrictions de permissions) — optionnel, géré aussi côté HTML
  useEffect(() => {
    // Pas de module natif boussole requis : DeviceOrientationEvent dans la WebView
    // gère cela de façon autonome sur Android et iOS via le navigateur embarqué.
    // Ce useEffect est réservé pour un éventuel module @react-native-community/sensors
    // si besoin d'une précision accrue plus tard.
  }, []);

  const html = buildLeafletHTML(
    userPosition.latitude,
    userPosition.longitude,
    risks
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* ── Barre de titre ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.headerTitle}>🗺️ Carte des risques</Text>
          <Text style={styles.headerSub}>
            {risks.length} risque{risks.length !== 1 ? 's' : ''} · rayon 1 km
          </Text>
        </View>
      </View>

      {/* ── WebView Leaflet ── */}
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        geolocationEnabled={false}      // on passe la position via params
        mixedContentMode="always"       // Android : permet http dans https WebView
        onError={(e) =>
          console.warn('[RiskMap] WebView error:', e.nativeEvent.description)
        }
        // Android : autorise DeviceOrientationEvent dans la WebView
        androidLayerType="hardware"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    paddingTop: Platform.OS === 'android' ? 12 : 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
  },
  titleBlock: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
});
