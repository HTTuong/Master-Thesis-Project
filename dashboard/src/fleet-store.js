/** The browser's copy of the fleet. Applies snapshot and batch messages from the server. */
export function createFleetStore() {
  const vehicles = new Map();

  return {
    vehicles,
    apply(message) {
      if (message.type === 'snapshot') vehicles.clear();
      for (const vehicle of message.vehicles) vehicles.set(vehicle.vehicleId, vehicle);
      return message.vehicles;
    },
  };
}
