import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useColors } from "@/hooks/useColors";

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeAddress(address: string): Promise<GeoResult | null> {
  try {
    const encoded = encodeURIComponent(address);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { "User-Agent": "FolkloreGardenApp/1.0" } }
    );
    const data = await resp.json();
    return data?.[0] || null;
  } catch {
    return null;
  }
}

function buildMapHtml(lat: number, lon: number, label: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${lat}, ${lon}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    var marker = L.marker([${lat}, ${lon}]).addTo(map);
    marker.bindPopup(${JSON.stringify(label)}).openPopup();
  </script>
</body>
</html>
`;
}

export default function TransportMapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { address, clientName } = useLocalSearchParams<{ address: string; clientName: string }>();
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (address) {
      geocodeAddress(address).then(result => {
        setGeoResult(result);
        setGeoError(!result);
        setLoading(false);
      });
    }
  }, [address]);

  function openInMaps() {
    if (!geoResult) return;
    const url = Platform.select({
      ios: `maps://?daddr=${geoResult.lat},${geoResult.lon}&dirflg=d`,
      android: `geo:${geoResult.lat},${geoResult.lon}?q=${encodeURIComponent(address || "")}`,
      default: `https://maps.google.com/?q=${geoResult.lat},${geoResult.lon}`,
    });
    if (url) Linking.openURL(url);
  }

  const mapHtml = geoResult
    ? buildMapHtml(
        parseFloat(geoResult.lat),
        parseFloat(geoResult.lon),
        clientName || address || "Cíl"
      )
    : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        {
          borderBottomColor: colors.border,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
        },
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {clientName || "Mapa přepravy"}
          </Text>
          {address && (
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {address}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Hledám adresu...
          </Text>
        </View>
      ) : geoError ? (
        <View style={styles.center}>
          <Feather name="alert-triangle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Adresu se nepodařilo najít
          </Text>
          <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
            {address}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.mapContainer}>
            {Platform.OS === "web" ? (
              <View style={[styles.webMapFallback, { backgroundColor: colors.secondary }]}>
                <Feather name="map-pin" size={40} color={colors.primary} />
                <Text style={[styles.webMapText, { color: colors.foreground }]}>
                  {clientName || "Cíl"}
                </Text>
                <Text style={[styles.webMapAddr, { color: colors.mutedForeground }]}>
                  {geoResult?.display_name || address}
                </Text>
                <Text style={[styles.webMapCoords, { color: colors.mutedForeground }]}>
                  {geoResult?.lat}, {geoResult?.lon}
                </Text>
              </View>
            ) : (
              mapHtml && (
                <WebView
                  source={{ html: mapHtml }}
                  style={styles.webview}
                  javaScriptEnabled
                  originWhitelist={["*"]}
                />
              )
            )}
          </View>

          <View style={[styles.bottomCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.addressRow}>
              <Feather name="map-pin" size={16} color={colors.destructive} />
              <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={3}>
                {geoResult?.display_name || address}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.mapsBtn, { backgroundColor: colors.primary }]}
              onPress={openInMaps}
              activeOpacity={0.8}
            >
              <Feather name="navigation" size={16} color="#fff" />
              <Text style={styles.mapsBtnText}>Otevřít v Mapách</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  errorSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  webMapText: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  webMapAddr: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  webMapCoords: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottomCard: {
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },
  addressRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  addressText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  mapsBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapsBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
