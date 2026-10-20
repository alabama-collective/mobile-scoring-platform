// MSP-41: the Give Classic regions and their schools, in ONE place.
//
// To fix a school name, edit it here (github.com's web editor is fine) and
// merge the change. Every school dropdown and every region calculation in the
// app uses this list, so no other file needs changing.
//
// List from Steph, Oct 8 2026: 7 schools in each region.
export const REGIONS: Record<string, string[]> = {
  'North Region': [
    'Alabama A&M University',
    'Oakwood University',
    'J.F. Drake State Community and Technical College',
    'Gadsden State Community College',
    'Talladega College',
    'Miles College',
    'Lawson State Community College',
  ],
  'South Region': [
    'Stillman College',
    'Shelton State Community College',
    'Selma University',
    'Alabama State University',
    'H. Councill Trenholm State Community College',
    'Tuskegee University',
    'Bishop State Community College',
  ],
};
