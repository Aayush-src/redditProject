export type Club = {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
};

export type Manager = {
  name: string;
  photo: string;
};

export type Jersey = {
  number: number;
  primaryColor: string;
  secondaryColor: string;
};

export type Player = {
  id: string;
  name: string;
  nationality: string;
  /** Chronological order: first club joined → most recent */
  clubs: Club[];
  managers: Manager[];
  jerseys: Jersey[];
};
