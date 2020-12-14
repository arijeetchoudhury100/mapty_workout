'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let map, mapEvent;

//workout data
class Workout {
  constructor(coords, dist, duration) {
    this.coords = coords; //[lat,long]
    this.dist = dist;
    this.duration = duration;
    this.date = new Date();
    this.id = (Date.now() + '').slice(-10);
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

//child classes
class Running extends Workout {
  constructor(coords, dist, duration, cadence) {
    super(coords, dist, duration);
    this.cadence = cadence;
    this.calcPace();
    this.type = 'running';
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.dist;
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, dist, duration, elevation) {
    super(coords, dist, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this.type = 'cycling';
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.dist / (this.duration / 60);
    return this.speed;
  }
}

//Main Application
class App {
  constructor() {
    this._workout = [];
    //get users position
    this._getPosition();

    //get local storage
    this._getLocalStorage();

    //handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    //console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this._workout.find(
      work => work.id === workoutEl.dataset.id
    );
    //console.log(workout);

    map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _getPosition() {
    //get current coordinates
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
  }

  _loadMap(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const coords = [lat, lon];
    map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    //handling clicks on map
    map.on('click', this._showForm.bind(this));

    //render localStorage workouts once map has loaded
    this._workout.forEach(work => this._renderMarker(work));
  }

  _showForm(mapE) {
    mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    e.preventDefault();

    const positiveInput = (...inputs) => inputs.every(inp => inp > 0);
    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDistance.value;
    const { lat, lng } = mapEvent.latlng;
    let workout;
    //validate data

    //if running create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInput(distance, duration, cadence) ||
        !positiveInput(distance, duration, cadence)
      )
        return alert('Distance, duration and cadence must be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //else create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInput(distance, duration, elevation) ||
        !positiveInput(distance, duration)
      )
        return alert('Distance and duration must be positive');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //add new workout to workout array
    this._workout.push(workout);

    //render object on map
    this._renderMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //hide form
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }

  //****IMP!! using local storage destroys the prototype chain****
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this._workout)); //stringify convers objects to strings
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    //console.log(data);

    if (!data) return;

    this._workout = data;
    this._workout.forEach(work => this._renderWorkout(work));
  }

  _renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(map)
      .bindPopup(
        L.popup({
          maxWdith: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id=${
      workout.id
    }>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type === 'running') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    } else {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevation}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
