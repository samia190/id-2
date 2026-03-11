// ===== Student QR Code Generator =====

(function () {
    'use strict';



    // --- DOM Elements ---
    const form = document.getElementById('studentForm');
    const photoInput = document.getElementById('studentPhoto');
    const photoUploadArea = document.getElementById('photoUploadArea');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const photoPreview = document.getElementById('photoPreview');
    const previewArea = document.getElementById('previewArea');
    const idCardContainer = document.getElementById('idCardContainer');
    const qrSection = document.getElementById('qrSection');
    const actionButtons = document.getElementById('actionButtons');
    const csvUploadArea = document.getElementById('csvUploadArea');
    const csvFile = document.getElementById('csvFile');
    const bulkPreview = document.getElementById('bulkPreview');
    const bulkTableBody = document.getElementById('bulkTableBody');

    let currentPhotoData = null;
    let currentStudentData = null;
    let bulkStudents = [];

    // --- Tabs ---
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'records') loadRecords();
        });
    });

    // --- Photo Upload ---
    photoUploadArea.addEventListener('click', () => photoInput.click());

    photoUploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        photoUploadArea.style.borderColor = 'var(--primary)';
    });

    photoUploadArea.addEventListener('dragleave', () => {
        photoUploadArea.style.borderColor = '';
    });

    photoUploadArea.addEventListener('drop', e => {
        e.preventDefault();
        photoUploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handlePhotoFile(file);
        }
    });

    photoInput.addEventListener('change', () => {
        if (photoInput.files[0]) {
            handlePhotoFile(photoInput.files[0]);
        }
    });

    function handlePhotoFile(file) {
        if (file.size > 2 * 1024 * 1024) {
            showToast('Photo must be less than 2MB', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            currentPhotoData = e.target.result;
            photoPreview.src = currentPhotoData;
            photoPreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            photoUploadArea.classList.add('has-photo');
        };
        reader.readAsDataURL(file);
    }

    // --- Form Submit ---
    form.addEventListener('submit', e => {
        e.preventDefault();

        const school = document.getElementById('schoolName').value.trim();
        const name = document.getElementById('studentName').value.trim();
        const adm = document.getElementById('admissionNo').value.trim();
        const cls = document.getElementById('studentClass').value.trim();

        if (!school || !name || !adm || !cls) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (!currentPhotoData) {
            showToast('Please upload a student photo', 'error');
            return;
        }

        currentStudentData = { school, name, adm, cls, photo: currentPhotoData };
        generateIDCard(currentStudentData);
    });

    // --- Generate ID Card & QR ---
    function generateIDCard(data) {
        // Fill ID card
        document.getElementById('cardSchool').textContent = data.school;
        document.getElementById('cardName').textContent = data.name;
        document.getElementById('cardAdm').textContent = data.adm;
        document.getElementById('cardClass').textContent = data.cls;
        document.getElementById('cardPhoto').src = data.photo;

        // Build profile URL (exclude photo — too large for QR codes)
        const profilePayload = {
            school: data.school,
            name: data.name,
            adm: data.adm,
            cls: data.cls
        };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(profilePayload))));
        // Redirect to dedicated profile.html page when QR is scanned
        const basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
        const profileURL = window.location.origin + basePath + 'profile.html?data=' + encoded;

        // Generate small QR on card
        const cardQR = document.getElementById('cardQR');
        cardQR.innerHTML = '';
        new QRCode(cardQR, {
            text: profileURL,
            width: 80,
            height: 80,
            colorDark: '#1e293b',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });

        // Generate large QR
        const qrLarge = document.getElementById('qrCodeLarge');
        qrLarge.innerHTML = '';
        new QRCode(qrLarge, {
            text: profileURL,
            width: 200,
            height: 200,
            colorDark: '#1e293b',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });

        // Show everything
        previewArea.style.display = 'none';
        idCardContainer.style.display = 'block';
        qrSection.style.display = 'block';
        actionButtons.style.display = 'grid';

        showToast('ID Card & QR Code generated!', 'success');
    }

    // --- Download QR Code as PNG ---
    document.getElementById('btnDownloadQR').addEventListener('click', () => {
        const qrCanvas = document.querySelector('#qrCodeLarge canvas');
        if (!qrCanvas) {
            showToast('Generate a QR code first', 'error');
            return;
        }
        const link = document.createElement('a');
        link.download = (currentStudentData.adm || 'student') + '_QR.png';
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
        showToast('QR Code downloaded!', 'success');
    });

    // --- Download ID Card as PDF ---
    document.getElementById('btnDownloadPDF').addEventListener('click', () => {
        const idCard = document.getElementById('idCard');
        html2canvas(idCard, { scale: 2, useCORS: true }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [54, 86]
            });
            const imgData = canvas.toDataURL('image/png');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
            pdf.save((currentStudentData.adm || 'student') + '_ID.pdf');
            showToast('ID Card PDF downloaded!', 'success');
        });
    });

    // --- Print ID Card ---
    document.getElementById('btnPrint').addEventListener('click', () => {
        window.print();
    });

    // --- Save Record ---
    document.getElementById('btnSave').addEventListener('click', () => {
        if (!currentStudentData) return;
        const records = JSON.parse(localStorage.getItem('studentRecords') || '[]');
        const exists = records.some(r => r.adm === currentStudentData.adm);
        if (exists) {
            showToast('Record with this admission number already exists', 'error');
            return;
        }
        records.push({ ...currentStudentData, savedAt: new Date().toISOString() });
        localStorage.setItem('studentRecords', JSON.stringify(records));
        showToast('Record saved successfully!', 'success');
    });

    // --- Load Records ---
    function loadRecords() {
        const records = JSON.parse(localStorage.getItem('studentRecords') || '[]');
        const list = document.getElementById('recordsList');
        const noRecords = document.getElementById('noRecords');
        const recordActions = document.getElementById('recordActions');

        if (records.length === 0) {
            noRecords.style.display = 'block';
            list.innerHTML = '';
            recordActions.style.display = 'none';
            return;
        }

        noRecords.style.display = 'none';
        recordActions.style.display = 'block';
        list.innerHTML = records.map((r, i) => `
            <div class="record-card">
                <div class="record-card-top">
                    <img src="${escapeAttr(r.photo)}" alt="Photo">
                    <div>
                        <div class="record-name">${escapeHTML(r.name)}</div>
                        <div class="record-school">${escapeHTML(r.school)}</div>
                    </div>
                </div>
                <div class="record-card-details">
                    <span><strong>Adm No:</strong> ${escapeHTML(r.adm)}</span>
                    <span><strong>Class:</strong> ${escapeHTML(r.cls)}</span>
                </div>
                <div class="record-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="window._app.viewRecord(${i})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window._app.deleteRecord(${i})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // --- Clear All Records ---
    document.getElementById('btnClearAll').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all saved records?')) {
            localStorage.removeItem('studentRecords');
            loadRecords();
            showToast('All records cleared', 'info');
        }
    });

    // --- CSV Upload ---
    csvUploadArea.addEventListener('click', () => csvFile.click());

    csvUploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        csvUploadArea.style.borderColor = 'var(--primary)';
    });

    csvUploadArea.addEventListener('dragleave', () => {
        csvUploadArea.style.borderColor = '';
    });

    csvUploadArea.addEventListener('drop', e => {
        e.preventDefault();
        csvUploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file) handleCSVFile(file);
    });

    csvFile.addEventListener('change', () => {
        if (csvFile.files[0]) handleCSVFile(csvFile.files[0]);
    });

    function handleCSVFile(file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: results => {
                bulkStudents = results.data.map(row => ({
                    school: (row.SchoolName || row.schoolName || row.School || '').trim(),
                    name: (row.StudentName || row.studentName || row.Name || '').trim(),
                    adm: (row.AdmissionNo || row.admissionNo || row.Adm || '').trim(),
                    cls: (row.Class || row.class || '').trim(),
                    photo: null
                })).filter(s => s.name && s.adm);

                if (bulkStudents.length === 0) {
                    showToast('No valid student data found in CSV', 'error');
                    return;
                }

                renderBulkTable();
                bulkPreview.style.display = 'block';
                showToast(bulkStudents.length + ' students imported!', 'success');
            },
            error: () => {
                showToast('Error reading CSV file', 'error');
            }
        });
    }

    function renderBulkTable() {
        bulkTableBody.innerHTML = bulkStudents.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHTML(s.school)}</td>
                <td>${escapeHTML(s.name)}</td>
                <td>${escapeHTML(s.adm)}</td>
                <td>${escapeHTML(s.cls)}</td>
                <td><button class="btn btn-primary btn-sm" onclick="window._app.generateSingle(${i})">
                    <i class="fas fa-qrcode"></i> Generate
                </button></td>
            </tr>
        `).join('');
    }

    // --- Download CSV Template ---
    document.getElementById('btnDownloadTemplate').addEventListener('click', () => {
        const csv = 'SchoolName,StudentName,AdmissionNo,Class\nKangaru Girls High School,Jane Mwangi,ADM/2024/001,Form 3 East\nKangaru Girls High School,Mary Njeri,ADM/2024/002,Form 2 West';
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'student_template.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Template downloaded!', 'success');
    });

    // --- Generate All Bulk ---
    document.getElementById('btnGenerateAll').addEventListener('click', () => {
        const noPhoto = bulkStudents.filter(s => !s.photo);
        if (noPhoto.length === bulkStudents.length) {
            showToast('Please add photos to students before generating. Use the Generate button on each row to add individual photos.', 'info');
            return;
        }
        const withPhoto = bulkStudents.filter(s => s.photo);
        const records = JSON.parse(localStorage.getItem('studentRecords') || '[]');
        let added = 0;
        withPhoto.forEach(s => {
            if (!records.some(r => r.adm === s.adm)) {
                records.push({ ...s, savedAt: new Date().toISOString() });
                added++;
            }
        });
        localStorage.setItem('studentRecords', JSON.stringify(records));
        showToast(added + ' student records saved! View them in Saved Records tab.', 'success');
    });

    // --- Toast ---
    function showToast(message, type) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- Escape Helpers ---
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Expose functions for inline handlers ---
    window._app = {
        viewRecord(index) {
            const records = JSON.parse(localStorage.getItem('studentRecords') || '[]');
            const r = records[index];
            if (!r) return;
            currentStudentData = r;

            // Switch to single tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('[data-tab="single"]').classList.add('active');
            document.getElementById('tab-single').classList.add('active');

            // Fill form
            document.getElementById('schoolName').value = r.school;
            document.getElementById('studentName').value = r.name;
            document.getElementById('admissionNo').value = r.adm;
            document.getElementById('studentClass').value = r.cls;
            currentPhotoData = r.photo;
            photoPreview.src = r.photo;
            photoPreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            photoUploadArea.classList.add('has-photo');

            generateIDCard(r);
        },

        deleteRecord(index) {
            if (!confirm('Delete this student record?')) return;
            const records = JSON.parse(localStorage.getItem('studentRecords') || '[]');
            records.splice(index, 1);
            localStorage.setItem('studentRecords', JSON.stringify(records));
            loadRecords();
            showToast('Record deleted', 'info');
        },

        generateSingle(index) {
            const student = bulkStudents[index];
            if (!student) return;

            // Prompt for photo
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = () => {
                const file = input.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                    showToast('Photo must be less than 2MB', 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = e => {
                    student.photo = e.target.result;
                    currentStudentData = student;
                    currentPhotoData = student.photo;

                    // Switch to single tab and generate
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    document.querySelector('[data-tab="single"]').classList.add('active');
                    document.getElementById('tab-single').classList.add('active');

                    document.getElementById('schoolName').value = student.school;
                    document.getElementById('studentName').value = student.name;
                    document.getElementById('admissionNo').value = student.adm;
                    document.getElementById('studentClass').value = student.cls;
                    photoPreview.src = student.photo;
                    photoPreview.style.display = 'block';
                    uploadPlaceholder.style.display = 'none';
                    photoUploadArea.classList.add('has-photo');

                    generateIDCard(student);
                };
                reader.readAsDataURL(file);
            };
            input.click();
        }
    };

})();
