// Simple script to seed test data to localStorage
const STORAGE_KEYS = {
    FILES: 'repocerti_files',
};

const testFiles = [
    {
        id: 'test-1',
        userId: 'demo-student',
        username: 'Demo Student',
        userRole: 'student',
        userDesignation: 'student',
        title: 'Extracted: Certificate of Achievement',
        type: 'certificate',
        content: 'Test certificate data',
        reportDate: new Date().toISOString(),
        category: 'Verification',
        createdAt: new Date().toISOString(),
        downloadsCount: 0
    },
    {
        id: 'test-2',
        userId: 'demo-faculty',
        username: 'Dr. Jane Faculty',
        userRole: 'staff',
        userDesignation: 'faculty',
        title: 'Report: Student Progress',
        type: 'report',
        content: '<p>This is a test report about student progress.</p>',
        category: 'Academic',
        reportDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        downloadsCount: 0
    }
];

// Add to localStorage
try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.FILES) || '[]');
    const combined = [...existing, ...testFiles];
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(combined));
    console.log('Test files seeded:', combined.length);
} catch (e) {
    console.error('Error seeding test files:', e);
}
