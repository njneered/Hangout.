import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

type GoogleMapProps = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  compact?: boolean;
};

export default function GoogleMap({
  latitude,
  longitude,
  title = 'Selected Location',
  description = '',
  compact = false,
}: GoogleMapProps) {
  const region: Region = {
    latitude,
    longitude,
    latitudeDelta: compact ? 0.008 : 0.01,
    longitudeDelta: compact ? 0.008 : 0.01,
  };

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          scrollEnabled={!compact}
          zoomEnabled={!compact}
          rotateEnabled={!compact}
          pitchEnabled={!compact}
          toolbarEnabled={false}
        >
        <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 1 }}>
      
          <View style={styles.pin}>
            <View style={styles.pinHead} />
            <View style={styles.pinTail} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1,},
  compactContainer: {width: 72, height: 72, borderRadius: 12, overflow: 'hidden',},
  map: {width: '100%', height: '100%',},
  pin: {alignItems: 'center',},
  pinHead: {width: 16, height: 16, borderRadius: 8, backgroundColor: '#ff3b30',},
  pinTail: { width: 2, height: 10, backgroundColor: '#ff3b30',},
});