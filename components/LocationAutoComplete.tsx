import { EVENTTHEME as THEME } from '@/constants/theme';
import React from 'react';
import { View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

type SelectedPlace = {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
};

type LocationProps = {
    onSelect: (place: SelectedPlace) => void;
}

export default function LocationAutocomplete({
onSelect,
}: LocationProps) {
    return (
        <View>
            <GooglePlacesAutocomplete
                placeholder = "Place name"
                textInputProps={{ placeholderTextColor: THEME.textMuted,}}
                fetchDetails={true}
                disableScroll={true}
                styles={googleStyles}
                onPress={(data, details = null) => {
                    if (!details) return;

                    onSelect({
                        name: details.name,
                        address: details.formatted_address,
                        latitude: details.geometry.location.lat,
                        longitude: details.geometry.location.lng,
                    });
                }}
                query={{
                    key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
                    language: 'en',
                    // TODO : Set boundaries based on user location. 
                }}
            />
        </View>
    );
}

const googleStyles = {
  container: {
    flex: 1,
  },

  textInputContainer: {
    backgroundColor: 'transparent',
  },

  textInput: {
    backgroundColor: 'transparent',
    color: THEME.text,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.purple,
    paddingVertical: 6,
    paddingHorizontal: 0,
    
  },

  listView: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginTop: 8,
  },

  row: {
    backgroundColor: THEME.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  separator: {
    height: 1,
    backgroundColor: THEME.cardBorder,
  },

  description: {
    color: THEME.text,
    fontSize: 14,
  },

  poweredContainer: {
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderColor: THEME.cardBorder,
  },

  loader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    height: 20,
  },
};