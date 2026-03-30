import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

const INITIAL_REGION: Region = {
  latitude: 29.6516,
  longitude: -82.3248,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function GoogleMap() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
      >
        <Marker
          coordinate={{ latitude: 29.6516, longitude: -82.3248 }}
          title="Gainesville"
          description="Example marker"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});