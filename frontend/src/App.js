import React, { useEffect, useState } from "react";
import GoogleMapReact from "google-map-react";
import pin from "./assets/circle.png";
import home from "./assets/home.png";
import haversineDistance from "./utilities/haversine";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { homeBase, homeBaseAddress } from "./constants";
import moment from "moment";
import "./App.scss";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const App = () => {
  const [vehicleData, setVehicleData] = useState([]);
  const [active, setActive] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Listening to changes on firestore
  useEffect(() => {
    const vehiclesCollection = collection(db, "vehicles");
    const unsubscribe = onSnapshot(
      vehiclesCollection,
      (snapshot) => {
        let data = snapshot.docs.map((doc) => doc.data());
        setVehicleData(data);
        setLastUpdated(
          moment(
            data.reduce((prev, cur) => {
              let d1 = moment(cur.location.time);
              let d2 = moment(prev.location.time);
              if (d1 < d2) return prev;
              else return cur;
            }).location.time
          ).format("YYYY-MM-DD HH:mm:ss")
        );
      },
      (err) => {
        console.log("Error Fetching From Firestore : ", err);
      }
    );
    return unsubscribe;
  }, []);

  const Card = ({ name, driver, id }) => {
    return (
      <div
        className="map__marker-content"
        style={{ display: active === id ? "block" : "none" }}
      >
        <div>Name : {name}</div>
        {driver && <div>Driver : {driver.name}</div>}
        {active === 0 && <div>Address : {homeBaseAddress}</div>}
        <div
          className="cross"
          onClick={(e) => {
            setActive(null);
            e.stopPropagation();
          }}
        >
          X
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="lastUpdated">
        <div>Last Updated</div>
        <div>{lastUpdated}</div>
      </div>
      <div className="map">
        <GoogleMapReact
          defaultCenter={homeBase}
          defaultZoom={11}
          bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAP_API_KEY }}
        >
          <div
            className="map__marker"
            lat={homeBase[0]}
            lng={homeBase[1]}
            style={{ zIndex: 10 }}
            onClick={() => {
              setActive(0);
            }}
          >
            <Card name={"HomeBase"} driver={null} id={0} />
            <img src={home} className="map__marker-pin" alt="pin" />
          </div>
          {vehicleData.map((vehicle) => {
            return (
              <div
                key={vehicle.id}
                className="map__marker"
                lat={vehicle.location.latitude}
                lng={vehicle.location.longitude}
                onClick={() => {
                  setActive(vehicle.id);
                }}
              >
                <img
                  alt="pin"
                  src={pin}
                  className="map__marker-pin"
                  style={{
                    border:
                      haversineDistance(homeBase, [
                        vehicle.location.latitude,
                        vehicle.location.longitude,
                      ]) <= 200
                        ? "2px solid green"
                        : null,
                  }}
                />
                <Card
                  name={vehicle.name}
                  driver={vehicle.driver}
                  id={vehicle.id}
                />
              </div>
            );
          })}
        </GoogleMapReact>
      </div>
      <div className="buttonGroup">
        <button className="btn_download">
          <a href="https://samsara-pplwork.herokuapp.com/invite" download>
            Download vehicles to invite
          </a>
        </button>
      </div>
    </div>
  );
};

export default App;
