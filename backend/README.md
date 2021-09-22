# Samsara Vehicle Tracker
Track the vehicles in your fleet with the ability to get a csv of the ones nearby.

## Backend 
Hosted on NodeJS(Express) + Firebase(Firestore). 

NodeJS provides a lightweight platform to setup calls to the samsara api.

Firestore allows high scalability ,we don't need to fetch from the node server as we can fetch from firestore directly.

## How it Works
1)  A cron job retrieves the data from the samsara [vehicles api](https://api.samsara.com/fleet/vehicles)
2)  Iterating over the vehicle data , a query string of comma seperated vehicle ids is generated.
3)  Locatiton data is fetched from the samsara [vehicle locations api](https://api.samsara.com/fleet/vehicles/locations?vehicleIds=) using the generated query string.
4)  A Combined Object Consisting of vehicle(id,name,driver) and location(time,lat,lng) is uploaded to firestore for each of the vehicles. The same data is also stored in the internal state of the server.
5)  json2csv module is used to generate a csv with the fields ('vehicle_name','vehicle_id','driver_name','driver_id','lastLocation','lastLocationTime'). Only the driver_name and driver_id field is nullable.
