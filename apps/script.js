 const apiKey = "YOUR ARCGIS Developer API KEY";

    Cesium.ArcGisMapService.defaultAccessToken = apiKey;

    const authentication = arcgisRest.ApiKeyManager.fromKey(apiKey);

    const cesiumAccessToken = "Your Cesium Token";
    Cesium.Ion.defaultAccessToken = cesiumAccessToken;

    Cesium.GoogleMaps.defaultApiKey = "Your Google MAPS TILE API";
    const arcGisImagery = Cesium.ArcGisMapServerImageryProvider.fromBasemapType(Cesium.ArcGisBaseMapType.SATELLITE, {
    enablePickFeatures:false
    });
    

    const viewer = new Cesium.Viewer("cesiumContainer", {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      timeline: false,
      animation: false,
      sceneModePicker: false,
      baseLayerPicker: false,
    });

    viewer.camera.setView({
      // destination : Cesium.Cartesian3.fromDegrees(18.611569,-33.9147, 16000), 
      // orientation : {
      //   pitch : Cesium.Math.toRadians(-70.0),
      // }
      destination: Cesium.Cartesian3.fromDegrees(25, -30, 10000000), 
      orientation: {
        heading: Cesium.Math.toRadians(0), 
        pitch: Cesium.Math.toRadians(-90), 
        roll: 0, 
    }
  });



// FEATURE #1 : DISTRICT MAP
const geoJsonUrl = "./data/topo.json";
let dataSource;

async function getCoordinatesFromJSON() {
  const response = await fetch("./data/data.json");
  const data = await response.json();
  return data.features
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      if (
        coordinates &&
        Array.isArray(coordinates) &&
        coordinates.length === 2
      ) {
        return { lat: coordinates[1], lon: coordinates[0] };
      }
      return null;
    })
    .filter((position) => position !== null);
}

function addGeoJsonDataSourceWithPopulationColor(url) {
  return Cesium.GeoJsonDataSource.load(url).then(function (loadedDataSource) {
    dataSource = loadedDataSource;
    // Access the entities in the data source
    const entities = dataSource.entities.values;

    
    let minPopulation = Number.MAX_VALUE;
    let maxPopulation = Number.MIN_VALUE;
    entities.forEach(function (entity) {
      const population = entity.properties["TPopulation"].getValue(); 
      if (population < minPopulation) {
        minPopulation = population;
      }
      if (population > maxPopulation) {
        maxPopulation = population;
      }
      return dataSource;
    });

   
    function getPinkColorWithOpacity(opacity) {
      return new Cesium.Color(0.0, 0.0, 1.0, opacity);
    }
    

  
    entities.forEach(function (entity) {
      const population = entity.properties["TPopulation"].getValue();
      const populationFraction =
        (population - minPopulation) / (maxPopulation - minPopulation);
      const opacity = populationFraction; 
      const color = getPinkColorWithOpacity(opacity);
      entity.polygon.material = new Cesium.ColorMaterialProperty(color);
    });

    return dataSource;
  });
}
function removeGeoJsonDataSource() {
  if (dataSource) {
    viewer.dataSources.remove(dataSource);
  }
}

function showGeoJsonDataSource() {
  if (dataSource) {
    viewer.dataSources.add(dataSource);
  }
}

addGeoJsonDataSourceWithPopulationColor(geoJsonUrl)
.then(function (dataSource) {
viewer.dataSources.add(dataSource);
dataSource.entities.values.forEach(function (entity) {
  entity.polygon.minimumPixelSize = 1; 
});
})
.catch(function (error) {
console.error("An error occurred: ", error);
});

const hideButton = document.getElementById("hideButton");
hideButton.addEventListener("click", removeGeoJsonDataSource);

const showButton = document.getElementById("showButton");
showButton.addEventListener("click", showGeoJsonDataSource);

// FEATURE # 2: DATA.JSON
async function getCoordinatesFromJSON() {
const response = await fetch('./data/data.json');
const jsonData = await response.json();
return jsonData.features;
} 

async function createModelAtLocation(position) {
const category = position.properties.Category;
let iconImage = '';

if (category === "Other Hospital") {
iconImage = 'images/other.png';
} else if (category === "District Hospital") {
iconImage = 'images/district.png';
}
else{
iconImage = 'images/private.png';
}

const coordinates = position.geometry.coordinates;
if (Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
const entity = viewer.entities.add({
category: "icon",
position: Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1]),
billboard: {
 image: iconImage,
 width: 32,
 height: 32,
 verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
 heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
 minimumPixelSize: 32, 
  },
  properties: {
    ...position.properties,
  },
});
if (entity.category === "icon") {
entity.description = `
 <h2>${position.properties.Name}</h2>
 <p><strong>Category:</strong> ${position.properties.Category}</p>
 <p><strong>Province:</strong> ${position.properties.Province}</p>
 <p><strong>District:</strong> ${position.properties.District}</p>
 <p><strong>Subdistrict:</strong> ${position.properties.Subdistrict}</p>
 <p><strong>BedsUsable:</strong> ${position.properties.BedsUsable}</p>
 <!-- Add more properties as needed -->
`;
const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
handler.setInputAction(() => {
 entity.description.show = !entity.description.show;
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
const dropdown = document.getElementById("dropdown");
dropdown.addEventListener("change", (event) => {
const selectedOption = event.target.value;

viewer.entities.values.forEach((entity) => {
if (entity.category === "icon") {
 const category = entity.properties.Category;
 if (selectedOption === "none") {
   entity.billboard.show = false;
   if (entity.label) entity.label.show = false;
   if (entity.description) entity.description.show = false;
 } else if (selectedOption === "all") {
   entity.billboard.show = true;
   if (entity.label) entity.label.show = true;
   if (entity.description) entity.description.show = true;
 } else {
   if (category === selectedOption) {
     entity.billboard.show = false;
     if (entity.label) entity.label.show = false;
     if (entity.description) entity.description.show = false;
   } else {
     entity.billboard.show = false;
     if (entity.label) entity.label.show = false;
     if (entity.description) entity.description.show = false;
   }
 }
}
});
});
}
}
getCoordinatesFromJSON().then((positions) => {
positions.forEach(createModelAtLocation);
});

     // FEATURE #1 : 3D TILES FLY OVER AND MAPPING
     var isFlying = false;
     var isPaused = false;
     var currentIndex = 0;
     var pausedHeading;
     var pausedPosition;
     
     async function flyOver() {
       try {
         const tileset = await Cesium.createGooglePhotorealistic3DTileset();
         viewer.scene.primitives.add(tileset);
     
         
         var cities = [
           { name: "Chris Hani Baragwanath Hospital: 2639 beds. Gauteng Province: Johannesburg D Health Sub-District", latitude: -26.26, longitude: 27.93799 }, 
          { name: "Dr George Mukhari Hospital: 1236 beds. Gauteng Province: Tshwane 1 Health Sub-District ", latitude: -25.619, longitude: 28.01216 }, 	
           { name: "Charlotte Maxeke Hospital: 1066 beds.  Gauteng Province:Johannesburg F Health Sub-District ", latitude: -26.174, longitude: 28.04691	 }, 
           { name: "Klerksdorp Hospital: 1015 beds. North West Province: City of Matlosana Local Municipality", latitude: -26.878627, longitude: 26.663295 }, 	
           { name: "Witrand Psych Hospital: 982 beds. North West Province : JB Marks Local Municipality", latitude: -26.7139, longitude: 27.09142 }, 	
           { name: "Ekuhlengeni Hospital: 1200 beds.KwaZulu Natal Province: eThekwini MM Sub district", latitude:-30.0071, longitude: 30.902844	 }, 
           { name: "Prince Mshiyeni Hospital: 1160 beds. KwaZulu Natal Province: eThekwini MM Sub district", latitude: -29.9548, longitude: 30.936625	},
           { name: "Tygerberg Hospital: 1310 beds.Western Cape Province: Tygerberg Health sub-District", latitude: -33.9147, longitude: 18.611569 }, 	
           { name: "Groote Schuur Hospital: 945 beds. Western Cape Province:Cape Town Western Health sub-District", latitude: -33.9408, longitude: 18.465164 }, 
           { name: "You can now see the next feature: service area visualisation", latitude: -33.9408, longitude: 18.455164} 		
         ];
     
         async function flyOverCities() {
           if (currentIndex < cities.length) {
             var city = cities[currentIndex];
             var cityNameElement = document.getElementById('cityName');
             var destination = Cesium.Cartesian3.fromDegrees(city.longitude, city.latitude, 2100);
             cityNameElement.innerText = city.name;
     
             viewer.camera.flyTo({
               destination: destination,
               duration: 10,
               complete: async function () {
                 if (!isPaused) {
                   currentIndex++;
                   await new Promise(resolve => setTimeout(resolve, 200)); // Delay before next city
                   flyOverCities();
                 }
               }
             });
           } else {
             isFlying = false;
           }
         }
     
         flyOverCities();
       } catch (error) {
         console.log(`Failed to load tileset: ${error}`);
       }
     }
     
     // Function to pause the flyover
     function pauseFlyover() {
       isPaused = true;
       pausedHeading = viewer.camera.heading;
       pausedPosition = viewer.camera.position.clone();
     }
     
     // Function to continue the flyover
     function continueFlyover() {
       if (isPaused) {
         isPaused = false;
         flyOver(); // Resume from where it was paused
       }
     }
     
     // Function to reset the flyover animation
     function resetFlyover() {
       isPaused = false;
       isFlying = false;
       currentIndex = 0;
       viewer.camera.setView({
         orientation: {
           heading: 0,
           pitch: 0,
           roll: 0
         },
         destination: Cesium.Cartesian3.fromDegrees(cities[0].longitude, cities[0].latitude, 2100)
       });
       flyOver();
     }
      const flyOverButton = document.getElementById("flyOverButton");
      const stopButton = document.getElementById("stopButton");
      const resumeButton = document.getElementById("resumeButton");
      
      flyOverButton.addEventListener("click", flyOver);
      stopButton.addEventListener("click", pauseFlyover);
      resumeButton.addEventListener("click", continueFlyover);
     
         // FEATURE 3
         function performServiceAreaAnalysis() {
           const pinBuilder = new Cesium.PinBuilder();
           const origin = viewer.entities.add({
             name: 'start',
             position: null,
             billboard: {
               verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
               heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
               image: pinBuilder.fromColor(Cesium.Color.fromCssColorString('#000000'), 48).toDataURL(),
             }
           });
         
           viewer.screenSpaceEventHandler.setInputAction(movement => {
             const pickedPosition = viewer.scene.pickPosition(movement.position);
             origin.position = pickedPosition;
             viewer.dataSources.removeAll();
             const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
             const originLatLng = [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];
             getServiceArea(originLatLng);
           }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
         
           function getServiceArea(coordinates) {
             arcgisRest
               .serviceArea({
                 facilities: [coordinates],
                 authentication
               })
               .then((response) => {
                 const serviceJSON = response.saPolygons.geoJson;
                 Cesium.GeoJsonDataSource.load(serviceJSON, {
                   clampToGround: true
                 })
                   .then((dataSource) => {
                     viewer.dataSources.add(dataSource);
                     const entities = dataSource.entities.values;
                     for (let i = 0; i < entities.length; i++) {
                       const feature = entities[i];
                       feature.polygon.outline = false;
                       if (feature.properties.FromBreak == 0) {
                         feature.polygon.material = Cesium.Color.fromHsl(0.5833, 0.8, 0.4, 0.7);
                         feature.polygon.extrudedHeight = 300;
                       } else if (feature.properties.FromBreak == 5) {
                         feature.polygon.material = Cesium.Color.fromHsl(0.5833, 0.8, 0.6, 0.7);
                         feature.polygon.extrudedHeight = 200;
                       } else {
                         feature.polygon.material = Cesium.Color.fromHsl(0.5833, 0.8, 0.8, 0.7);
                         feature.polygon.extrudedHeight = 100;
                       }
                     }
                   });
               });
           }
         
           origin.position = Cesium.Cartesian3.fromDegrees(-122.39429, 37.78988);
           getServiceArea([18.611569,-33.9147]);
         }
     
          
       