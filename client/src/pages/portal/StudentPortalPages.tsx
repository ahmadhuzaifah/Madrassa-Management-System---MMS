import { PortalDataPage } from './PortalPages';

export const StudentPortalHomePage = () => <PortalDataPage title="Student Portal" endpoint="/api/portal/student/dashboard" />;
export const StudentPortalDashboardPage = () => <PortalDataPage title="Student Dashboard" endpoint="/api/portal/student/dashboard" />;
export const StudentPortalProfilePage = () => <PortalDataPage title="Student Profile" endpoint="/api/portal/student/profile" />;
export const StudentPortalAttendancePage = () => <PortalDataPage title="Student Attendance" endpoint="/api/portal/student/attendance" />;
export const StudentPortalResultsPage = () => <PortalDataPage title="Student Results" endpoint="/api/portal/student/results" />;
export const StudentPortalFeesPage = () => <PortalDataPage title="Student Fees" endpoint="/api/portal/student/fees" />;
export const StudentPortalLibraryPage = () => <PortalDataPage title="Student Library" endpoint="/api/portal/student/library" />;
export const StudentPortalCertificatesPage = () => <PortalDataPage title="Student Certificates" endpoint="/api/portal/student/certificates" />;

