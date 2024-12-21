using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;

string projectId = "crypto-pachinko";
string serviceAccount = "firebase-adminsdk-dqjkl@crypto-pachinko.iam.gserviceaccount.com";

var firestore = FirestoreDb.Create(projectId);
Console.WriteLine($"Firestore created. ProjectId: {projectId}");

var defaultCredentials = await Google.Apis.Auth.OAuth2.GoogleCredential.GetApplicationDefaultAsync();

//FirebaseApp.Create();
//FirebaseApp.DefaultInstance.Options.ProjectId = projectId;
FirebaseApp.Create(new AppOptions()
{
    Credential = defaultCredentials,
    ServiceAccountId = serviceAccount,
    ProjectId = projectId,
});

// Create User
var userArgs = new UserRecordArgs()
{
    Uid = "testuser_1",
    Email = "testuser_1@test.com",
    Disabled = false,
};

// Create UserRecord to firebase
var userRecord = await FirebaseAuth.DefaultInstance.CreateUserAsync(userArgs);
Console.WriteLine("Successfully created new user: " + userRecord.Uid);