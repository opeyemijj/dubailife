// The home lift's doors (ApartmentRoom drives them, the lift's 3D model in LuxuryDecor draws them): how far open
// they are (0 shut, 1 open), eased towards `target`. One lift is on screen at a time (the floor you're on).
export const liftDoors = { open: 0, target: 0 };
