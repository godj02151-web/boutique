// ========== VARIABLES GLOBALES ADMIN ==========
let produits = [];
let produitsFiltres = [];
let imageCount = 1;

// ========== GESTION DES IMAGES ==========
function ajouterChampImage() {
    if (imageCount < 5) {
        imageCount++;
        const container = document.getElementById('images-container');
        const newRow = document.createElement('div');
        newRow.className = 'image-upload-row';
        newRow.innerHTML = `
            <input type="url" class="image-input" placeholder="URL image ${imageCount}">
            <button type="button" onclick="this.parentElement.remove(); imageCount--;" class="btn-remove-image">-</button>
        `;
        container.appendChild(newRow);
    } else {
        alert('Maximum 5 images par produit');
    }
}

// ========== CHARGEMENT DES PRODUITS ==========
async function chargerProduits() {
    try {
        // Essayer de charger depuis localStorage d'abord
        const savedProduits = localStorage.getItem('catalogue_produits');
        if (savedProduits) {
            const data = JSON.parse(savedProduits);
            produits = data.produits || [];
            produitsFiltres = [...produits];
            console.log('Produits chargés depuis localStorage:', produits.length);
            afficherProduits();
            mettreAJourStats();
            return;
        }

        // Sinon charger depuis le fichier JSON
        const response = await fetch('produits.json?' + Date.now());
        const data = await response.json();
        produits = data.produits || [];
        produitsFiltres = [...produits];
        afficherProduits();
        mettreAJourStats();
    } catch (error) {
        console.log('Création d\'une nouvelle liste de produits');
        produits = [];
        produitsFiltres = [];
        afficherProduits();
    }
}

// ========== AFFICHAGE DES PRODUITS ==========
function afficherProduits() {
    const container = document.getElementById('produitsList');

    if (produitsFiltres.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 30px; color: #7f8c8d;">Aucun produit trouvé</p>';
        return;
    }

    container.innerHTML = produitsFiltres.map(p => {
        const imageSrc = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/80';

        return `
            <div class="produit-card">
                <img src="${imageSrc}" alt="${p.nom}" onerror="this.src='https://via.placeholder.com/80'">
                <div class="produit-info">
                    <h4>
                        ${p.nom}
                        ${p.promo ? '<span class="badge-promo">PROMO</span>' : ''}
                    </h4>
                    <div class="prix">${p.prix.toLocaleString()} FCFA</div>
                    <div class="stock">Stock: ${p.stock} | Note: ${p.note}/5</div>
                    <small>${p.description.substring(0, 60)}...</small>
                    <small>📸 ${p.images ? p.images.length : 0} image(s)</small>
                </div>
                <div class="actions">
                    <button class="btn-icon btn-edit" onclick="editerProduit(${p.id})" title="Modifier">✏️</button>
                    <button class="btn-icon btn-duplicate" onclick="dupliquerProduit(${p.id})" title="Dupliquer">📋</button>
                    <button class="btn-icon btn-delete" onclick="supprimerProduit(${p.id})" title="Supprimer">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// ========== STATISTIQUES ==========
function mettreAJourStats() {
    document.getElementById('total-produits').textContent = produits.length;
    const stockTotal = produits.reduce((acc, p) => acc + (p.stock || 0), 0);
    document.getElementById('total-stock').textContent = stockTotal;
    const promoTotal = produits.filter(p => p.promo).length;
    document.getElementById('total-promo').textContent = promoTotal;
    const valeurStock = produits.reduce((acc, p) => acc + ((p.prix || 0) * (p.stock || 0)), 0);
    document.getElementById('valeur-stock').textContent = valeurStock.toLocaleString() + ' FCFA';
}

// ========== SAUVEGARDE PRODUIT ==========
async function sauvegarderProduit() {
    const produitId = document.getElementById('produitId').value;

    const imageInputs = document.querySelectorAll('.image-input');
    const images = Array.from(imageInputs)
        .map(input => input.value.trim())
        .filter(url => url !== '');

    if (images.length === 0) {
        alert('Veuillez ajouter au moins une image');
        return;
    }

    const produit = {
        id: produitId ? parseInt(produitId) : Date.now(),
        nom: document.getElementById('nom').value,
        description: document.getElementById('description').value,
        prix: parseInt(document.getElementById('prix').value),
        prixOriginal: parseInt(document.getElementById('prixOriginal').value) || parseInt(document.getElementById('prix').value),
        images: images,
        categorie: document.getElementById('categorie').value,
        promo: document.getElementById('promo').checked,
        marque: document.getElementById('marque').value || 'Générique',
        stock: parseInt(document.getElementById('stock').value) || 0,
        livraison: document.getElementById('livraison').value,
        note: parseFloat(document.getElementById('note').value) || 4.5,
        avis: 0
    };

    if (produitId) {
        const index = produits.findIndex(p => p.id === parseInt(produitId));
        produits[index] = produit;
        montrerNotification('✅ Produit modifié avec succès');
    } else {
        produits.push(produit);
        montrerNotification('✅ Nouveau produit ajouté');
    }

    produitsFiltres = [...produits];
    afficherProduits();
    mettreAJourStats();
    resetForm();
    synchroniserBoutique();
}

// ========== ÉDITION PRODUIT ==========
function editerProduit(id) {
    const produit = produits.find(p => p.id === id);

    document.getElementById('produitId').value = produit.id;
    document.getElementById('nom').value = produit.nom;
    document.getElementById('description').value = produit.description;
    document.getElementById('prix').value = produit.prix;
    document.getElementById('prixOriginal').value = produit.prixOriginal;
    document.getElementById('categorie').value = produit.categorie;
    document.getElementById('promo').checked = produit.promo;
    document.getElementById('marque').value = produit.marque;
    document.getElementById('stock').value = produit.stock;
    document.getElementById('livraison').value = produit.livraison;
    document.getElementById('note').value = produit.note;

    // Gérer les images
    const container = document.getElementById('images-container');
    container.innerHTML = '';

    if (produit.images && produit.images.length > 0) {
        produit.images.forEach((imgUrl, index) => {
            const newRow = document.createElement('div');
            newRow.className = 'image-upload-row';
            if (index === 0) {
                newRow.innerHTML = `
                    <input type="url" class="image-input" value="${imgUrl}" placeholder="URL image ${index + 1}" required>
                    <button type="button" onclick="ajouterChampImage()" class="btn-add-image">+</button>
                `;
            } else {
                newRow.innerHTML = `
                    <input type="url" class="image-input" value="${imgUrl}" placeholder="URL image ${index + 1}">
                    <button type="button" onclick="this.parentElement.remove(); imageCount--;" class="btn-remove-image">-</button>
                `;
            }
            container.appendChild(newRow);
        });
        imageCount = produit.images.length;
    }

    document.getElementById('form-icon').textContent = '✏️';
    document.getElementById('form-title').textContent = 'Modifier le produit';
    document.querySelector('.form-produit').scrollIntoView({ behavior: 'smooth' });
}

// ========== DUPLIQUER PRODUIT ==========
function dupliquerProduit(id) {
    const produit = produits.find(p => p.id === id);
    const nouveauProduit = {
        ...produit,
        id: Date.now(),
        nom: produit.nom + ' (copie)',
        images: [...produit.images]
    };
    produits.push(nouveauProduit);
    produitsFiltres = [...produits];
    afficherProduits();
    mettreAJourStats();
    montrerNotification('📋 Produit dupliqué');
    synchroniserBoutique();
}

// ========== SUPPRIMER PRODUIT ==========
async function supprimerProduit(id) {
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
        produits = produits.filter(p => p.id !== id);
        produitsFiltres = [...produits];
        afficherProduits();
        mettreAJourStats();
        montrerNotification('🗑️ Produit supprimé');
        synchroniserBoutique();
    }
}

// ========== FILTRES ==========
function filtrerProduits(recherche) {
    const terme = recherche.toLowerCase();
    produitsFiltres = produits.filter(p =>
        p.nom.toLowerCase().includes(terme) ||
        p.description.toLowerCase().includes(terme) ||
        p.marque.toLowerCase().includes(terme)
    );
    afficherProduits();
}

// ========== RÉINITIALISATION FORMULAIRE ==========
function resetForm() {
    document.getElementById('produitForm').reset();
    document.getElementById('produitId').value = '';

    // Réinitialiser les images
    const container = document.getElementById('images-container');
    container.innerHTML = `
        <div class="image-upload-row">
            <input type="url" class="image-input" placeholder="URL image 1" required>
            <button type="button" onclick="ajouterChampImage()" class="btn-add-image">+</button>
        </div>
    `;
    imageCount = 1;

    document.getElementById('form-icon').textContent = '➕';
    document.getElementById('form-title').textContent = 'Ajouter un nouveau produit';
}

// ========== EXPORT JSON ==========
function exporterJSON() {
    const dataStr = JSON.stringify({ produits }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'produits.json';
    a.click();
    montrerNotification('📥 Fichier JSON exporté');
}

// ========== SYNCHRONISATION BOUTIQUE ==========
async function synchroniserBoutique() {
    // Sauvegarder dans localStorage pour que la boutique puisse lire
    const dataStr = JSON.stringify({ produits }, null, 2);
    localStorage.setItem('catalogue_produits', dataStr);

    // Optionnel: essayer de sauvegarder dans le fichier JSON
    try {
        // Vous pouvez ajouter ici une API pour sauvegarder sur le serveur
        montrerNotification('🔄 Produits synchronisés avec la boutique');
    } catch (error) {
        console.log('Synchronisation localStorage uniquement');
        montrerNotification('💾 Produits sauvegardés localement');
    }
}

// ========== NOTIFICATIONS ==========
function montrerNotification(message) {
    // Supprimer les anciennes notifications
    const anciennesNotifications = document.querySelectorAll('.notification');
    anciennesNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    chargerProduits();
});