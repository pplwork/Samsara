# Samsara Vehicle Tracker
Track the vehicles in your fleet with the ability to get a csv of the ones nearby.

## Frontend 
1) Fetches the vehicle locations whenever 'vehicles' collection changes on firestore.
2) Sets the Last Updated Value (the last time when a vehicles location was updated).
3) Render the vehicle and home base pins on the map.
4) Vehicles within 200km of the home base have a green border rendered around them.
5) Clicking on a pin renders a popup with the details.
6) Clicking On "Download vehicles to invite" downloads a csv with the list of all vehicles and associated data within a 200km radius of the homebase.
