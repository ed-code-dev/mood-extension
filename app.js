let db
let weather
let latitude
let longitude

// Open (or create) a database
const request = window.indexedDB.open('moodTracker', 8)

// Handle database upgrades (e.g., create object store)
request.onupgradeneeded = function (event) {
  db = event.target.result
  db.createObjectStore('moods', {
    keyPath: 'id',
    autoIncrement: true
  })
}

// Handle success
request.onsuccess = function (event) {
  db = event.target.result
  console.log('Database opened successfully')
}

// Handle error
request.onerror = function (event) {
  console.error('Database error:', event.target.errorCode)
}

async function weatherData () {
  // const params = {
  //   latitude,
  //   longitude,
  //   current: ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day', 'rain', 'showers', 'snowfall', 'weather_code', 'cloud_cover', 'pressure_msl', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'],
  //   forecast_days: 1
  // }

  // const API = '7f9d067332367ffcd985dc0cb0325582'
  // const LAT = '47.467327'
  // const LNG = '9.565372'
  const LAT = latitude
  const LNG = longitude
  const URL = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LNG}&appid=${API}&units=metric`
  // const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
  return fetch(URL)
    .then((response) => response.json())
    .then((json) => {
      weather = json
    })
    .catch((error) => console.error('Error:', error))
}

function exportDataAsJSON (dbName, storeName) {
  return new Promise((resolve, reject) => {
    // Open the IndexedDB database
    const request = window.indexedDB.open(dbName)

    request.onerror = (event) => {
      reject(new Error('Error opening IndexedDB: ' + event.target.errorCode))
    }

    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction([storeName], 'readonly')
      const objectStore = transaction.objectStore(storeName)
      const data = []

      // Open a cursor to iterate through all records
      const cursorRequest = objectStore.openCursor()

      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          data.push(cursor.value) // Add each record to the array
          cursor.continue() // Move to the next record
        } else {
          // When the cursor is done, resolve the data
          resolve(data)
        }
      }

      cursorRequest.onerror = (event) => {
        reject(new Error('Error fetching data: ' + event.target.errorCode))
      }
    }
  })
}

// Trigger the download of the JSON file
function downloadJSON (data, fileName) {
  const jsonStr = JSON.stringify(data, null, 2) // Convert data to JSON string
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  // Create a download link
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

document.getElementById('faces').addEventListener('click', function (event) {
  const svgElement = event.target.closest('svg')

  if (svgElement && svgElement.id) {
    const time = showCurrentTime()
    // Add data to IndexedDB
    const transaction = db.transaction(['moods'], 'readwrite')
    const objectStore = transaction.objectStore('moods')
    const mood = {
      mood: svgElement.id,
      time,
      weather
    }

    const request = objectStore.add(mood)

    request.onsuccess = function (event) {
      console.log('Mood added to the database:', event.target.result)
      const x = document.getElementById('toast')
      x.className = 'show'
      setTimeout(function () {
        x.className = x.className.replace('show', '')
      }, 3000)
    }

    request.onerror = function (event) {
      console.error('Error adding user:', event.target.errorCode)
    }
  }
})

document.getElementById('export-data').addEventListener('click', function () {
  exportDataAsJSON('moodTracker', 'moods')
    .then((data) => {
      downloadJSON(data, 'exportedData.json') // Downloads the data as JSON
    })
    .catch((error) => {
      console.error('Error exporting data: ', error)
    })
})

function showCurrentTime () {
  const currentTime = new Date()
  const currentTimeToDisplay = currentTime.toLocaleString({
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  })

  const getWeekday = (date) =>
    [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ][date.getDay()]

  const nD = currentTimeToDisplay + ', ' + getWeekday(currentTime)
  return nD.split(',')
}

function getPosition () {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(position => {
      resolve(position.coords)
    }, error => {
      reject(error)
    })
  })
}

async function deviceLocation () {
  try {
    // 7const position = await getPosition()
    // console.log(`Latitude: ${position.latitude}, Longitude: ${position.longitude}`)
    // latitude = position.latitude
    // longitude = position.longitude
    latitude = 47.467198
    longitude = 9.5653525
    weatherData()
  } catch (error) {
    console.error('Error getting location:', error)
    if (error.code === error.PERMISSION_DENIED) {
      console.log('User denied the request for Geolocation.')
    }
  }
}

deviceLocation()

// Call the function every second to update the time
// setInterval(showCurrentTime, 1000);

// Initial call to display the time immediately when the page loads
// showCurrentTime();
