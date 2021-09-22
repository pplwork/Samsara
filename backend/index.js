require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const CronJob = require("cron").CronJob;
const admin = require("firebase-admin");
const haversineDistance = require("./utilities/haversine");
const Parser = require("json2csv").Parser;
const { homeBase, API_BASE_URL } = require("./constants");

//firebase admin initialized
admin.initializeApp({
  credential: admin.credential.cert(
    require("./samsara-15b80-firebase-adminsdk-ysxy5-dec7614018.json")
  ),
});

// express setup and middlewares
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// in-memory variables
let VehicleData = [];
let job;

const getData = async () => {
  // performance timer for the function
  console.time("runtime");
  let response;
  let data = [];
  let pagination;
  // initial request to initialize data, pagination.
  try {
    response = await axios(`${API_BASE_URL}/fleet/vehicles`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
    });
    data = response.data.data;
    pagination = response.data.pagination;

    //keep requesting data until hasNextPage is false
    while (pagination.hasNextPage) {
      response = await axios(`${API_BASE_URL}/fleet/vehicles`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
        params: {
          after: pagination.endCursor,
        },
      });
      data.push(...response.data.data);
      pagination = response.data.pagination;
    }
  } catch (err) {
    //in case of an error, log to console and exit the function, no updates on firestore will be made.
    console.log(err);
    return;
  }
  let locationData = [];
  // create a string consisting of comma seperated vehicle ids
  let queryString = data
    .reduce((prev, cur) => cur.id + "," + prev, "")
    .slice(0, -1);
  // initial request to initialize locationData, pagination
  try {
    response = await axios(`${API_BASE_URL}/fleet/vehicles/locations`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
      params: {
        vehicleIds: queryString,
      },
    });
    locationData = response.data.data;
    pagination = response.data.pagination;
    // keep requesting data until hasNextPage is false
    while (pagination.hasNextPage) {
      response = await axios(`${API_BASE_URL}/fleet/vehicles/locations`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
        params: {
          vehicleIds: queryString,
          after: pagination.endCursor,
        },
      });
      locationData.push(...response.data.data);
      pagination = response.data.pagination;
    }
  } catch (err) {
    //in case of an error, log to console and exit the function, no updates on firestore will be made.
    console.log(err);
    return;
  }
  VehicleData = [];
  let Promise_array = [];
  // combining data and locationData array to get an array of objects{name,id,location,driver}
  for (let i = 0; i < locationData.length; ++i) {
    VehicleData.push({
      name: locationData[i].name,
      id: locationData[i].id,
      location: {
        time: locationData[i].location.time,
        latitude: locationData[i].location.latitude,
        longitude: locationData[i].location.longitude,
      },
      driver: data[i].staticAssignedDriver
        ? {
            id: data[i].staticAssignedDriver.id,
            name: data[i].staticAssignedDriver.name,
          }
        : null,
    });
    // Push the firestore promise to a promise array, will Promise.all later to check when all updates have resolved (or rejected)
    Promise_array.push(
      admin
        .firestore()
        .collection("vehicles")
        .doc(locationData[i].id)
        .set({
          ...VehicleData[i],
        })
    );
  }
  // Wait till all firestore updates have been completed
  try {
    await Promise.all(Promise_array);
  } catch (err) {
    console.log(err);
  }
  // ending performance timer
  console.timeEnd("runtime");
  console.log("\n\n");
};

// filters VehicleData using the haversine formula to get vehicles within 200km of home base, generates a csv and sends it to the client.
app.get("/invite", async (req, res) => {
  let curData = VehicleData;
  curData = curData
    .filter(
      (e) =>
        haversineDistance(homeBase, [
          e.location.latitude,
          e.location.longitude,
        ]) <= 200
    )
    .map((e) => {
      return {
        vehicle_name: e.name,
        vehicle_id: e.id,
        driver_name: e.driver ? e.driver.name : null,
        driver_id: e.driver ? e.driver.id : null,
        lastLocation: [e.location.latitude, e.location.longitude],
        lastLocationTime: e.location.time,
      };
    });
  const json2csv = new Parser({
    fields: [
      "vehicle_name",
      "vehicle_id",
      "driver_name",
      "driver_id",
      "lastLocation",
      "lastLocationTime",
    ],
  });
  const csv = json2csv.parse(curData);
  res.header("Content-Type", "text/csv");
  let d = new Date().toISOString();
  res.attachment(`Invites ${d}.csv`);
  return res.send(csv);
});

// setting up a cron job for executing getData every 10seconds.
job = new CronJob(
  "*/30 * * * * *",
  getData,
  null,
  false,
  "America/Los_Angeles"
);
job.start();

app.listen(process.env.PORT || 8000, () => {
  console.log("express listening");
});
