import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const generateAndUploadPDF = async (elementId: string, fileName: string): Promise<string> => {
    try {
        const element = document.getElementById(elementId);
        if (!element) throw new Error("Element not found");

        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Convert PDF to Blob
        const pdfBlob = pdf.output('blob');

        // Upload to Firebase Storage
        const storageRef = ref(storage, `letters/${fileName}_${Date.now()}.pdf`);
        await uploadBytes(storageRef, pdfBlob);

        // Get Download URL
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;

    } catch (error) {
        console.error("PDF Generation/Upload Failed:", error);
        throw error;
    }
};

export const sendDirectEmail = async (
    config: { serviceId: string, templateId: string, publicKey: string },
    toEmail: string,
    subject: string,
    message: string,
    pdfLink: string
) => {
    // @ts-ignore
    if (!window.emailjs) throw new Error("EmailJS not loaded");

    const templateParams = {
        to_email: toEmail,
        subject: subject,
        message: message,
        pdf_link: pdfLink
    };

    // @ts-ignore
    await window.emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
};